require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'data', 'database.json');

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Ensure DB exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'));
}
if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, '[]');
}

// Helpers
const readData = () => {
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return [];
    }
};

const writeData = (data) => {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
};

// API Endpoints

// Get all reports
app.get('/api/reports', (req, res) => {
    const reports = readData();
    res.json(reports);
});

// Function to send data to Telegram
async function sendToTelegram(reportData) {
    try {
        // Format message for Telegram
        let message = `📊 <b>Новый отчет от ${reportData.department}</b>\n\n`;
        message += `🏢 Отдел: ${reportData.department}\n`;
        message += `📅 Период: ${reportData.period.week_dates}\n`;
        message += `📈 Тип отчета: ${reportData.report_type === 'weekly' ? 'Недельный' : 'Месячный'}\n\n`;

        // Add KPIs
        message += `<b>🎯 Показатели:</b>\n`;
        if (reportData.kpi_indicators.deals.quantity > 0) {
            message += `🔹 Сделки: ${reportData.kpi_indicators.deals.quantity} (${reportData.kpi_indicators.deals.description})\n`;
        }
        if (reportData.kpi_indicators.meetings.quantity > 0) {
            message += `🔹 Планерки: ${reportData.kpi_indicators.meetings.quantity} (${reportData.kpi_indicators.meetings.description})\n`;
        }
        if (reportData.kpi_indicators.training.quantity > 0) {
            message += `🔹 Обучение: ${reportData.kpi_indicators.training.quantity} (${reportData.kpi_indicators.training.description})\n`;
        }

        // Add tasks
        if (reportData.tasks && reportData.tasks.length > 0) {
            message += `\n<b>✅ Задачи:</b>\n`;
            reportData.tasks.forEach((task, index) => {
                message += `${index + 1}. <b>${task.task_text}</b> - ${task.status}\n`;
                if (task.product) {
                    message += `   Продукт: ${task.product}\n`;
                }
                if (task.comment) {
                    message += `   Комментарий: ${task.comment}\n`;
                }
            });
        }

        // Add unplanned tasks
        if (reportData.unplanned_tasks && reportData.unplanned_tasks.length > 0) {
            message += `\n<b>⚠️ Вне плана:</b>\n`;
            reportData.unplanned_tasks.forEach((task, index) => {
                message += `${index + 1}. <b>${task.task_text}</b> - ${task.status}\n`;
                if (task.product) {
                    message += `   Продукт: ${task.product}\n`;
                }
            });
        }

        // Calculate stats
        message += `\n📊 Эффективность: ${reportData.calculated_stats.percent}% (${reportData.calculated_stats.done}/${reportData.calculated_stats.total})`;

        // Send to Telegram bot
        const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
        const telegramChatId = process.env.TELEGRAM_CHAT_ID;

        if (!telegramBotToken || !telegramChatId) {
            console.error('Telegram credentials not set');
            return;
        }

        const telegramApiUrl = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;

        const response = await axios.post(telegramApiUrl, {
            chat_id: telegramChatId,
            text: message,
            parse_mode: 'HTML'
        });

        console.log('Successfully sent to Telegram:', response.data);
    } catch (error) {
        console.error('Error sending to Telegram:', error.response?.data || error.message);
    }
}

// Save or Update Report
app.post('/api/reports', async (req, res) => {
    const newReport = req.body;
    let reports = readData();

    // Check if updating existing by ID
    const existingIndexById = reports.findIndex(r => r.id === newReport.id);

    if (existingIndexById >= 0) {
        // Full overwrite (Editing mode)
        reports[existingIndexById] = newReport;
    } else {
        // Add new
        reports.unshift(newReport);
    }

    writeData(reports);

    // Send to Telegram in the background
    sendToTelegram(newReport);

    res.json({ success: true, report: newReport });
});

// Update entire list (for merging logic handled on client or bulk updates)
app.post('/api/reports/sync', (req, res) => {
    const updatedReports = req.body;
    writeData(updatedReports);
    res.json({ success: true });
});

// Serve Frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});