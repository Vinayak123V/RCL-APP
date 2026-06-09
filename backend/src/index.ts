import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server as SocketIO } from 'socket.io';
import nodemailer from 'nodemailer';
import dns from 'dns';
import { initDb } from './db';

// Force Node to prefer IPv4 to fix ENETUNREACH errors on Render for Gmail SMTP
dns.setDefaultResultOrder('ipv4first');
import batteryRouter, { setLatestData } from './routes/battery';
import { BatteryData } from '../../shared/types';

const app = express();
const server = http.createServer(app);
const io = new SocketIO(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());
app.use('/battery', batteryRouter);

// Raise Ticket Endpoint
app.post('/ticket', async (req, res) => {
  const { issue, userInfo } = req.body;
  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        // IMPORTANT: This user MUST be the exact Gmail address that generated the App Password
        user: 'vinayakhosur85@gmail.com',
        pass: 'nowxkyjmvgcfptsp',
      },
    });

    const mailOptions = {
      from: '"ASTRA System" <vinayakhosur85@gmail.com>',
      to: 'hosurv45@gmail.com',
      subject: 'New Issue Ticket Raised from ASTRA App',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: #0056b3; border-bottom: 2px solid #0056b3; padding-bottom: 10px;">ASTRA App - New Issue Ticket</h2>
          <p><strong>Date & Time:</strong> ${new Date().toLocaleString()}</p>
          
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #d9534f;">
            <h3 style="margin-top: 0; color: #d9534f; font-size: 18px;">Issue Description</h3>
            <p style="white-space: pre-wrap; font-size: 15px; line-height: 1.5;">${issue}</p>
          </div>
          
          <div style="background-color: #f0f8ff; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #31708f;">
            <h3 style="margin-top: 0; color: #31708f; font-size: 18px;">User Information</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              ${userInfo ? Object.entries(userInfo).map(([key, value]) => `
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold; width: 35%; color: #555; text-transform: capitalize;">${key.replace(/([A-Z])/g, ' $1').trim()}</td>
                  <td style="padding: 8px; border-bottom: 1px solid #ddd; word-break: break-all; color: #333;">${value}</td>
                </tr>
              `).join('') : '<tr><td>No user info provided.</td></tr>'}
            </table>
          </div>
          
          <p style="font-size: 12px; color: #777; text-align: center; margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px;">
            This is an automated message generated from the ASTRA application.<br>Please do not reply directly to this email.
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: 'Ticket raised successfully' });
  } catch (error) {
    console.error('Error sending ticket:', error);
    res.status(500).json({ success: false, error: 'Failed to raise ticket' });
  }
});

// WebSocket: push real-time data to all connected clients
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

export function broadcastData(data: BatteryData) {
  setLatestData(data);
  io.emit('battery:data', data);
}

const PORT = process.env.PORT || 3001;

async function start() {
  try {
    await initDb();
    console.log('Database initialized successfully.');
  } catch (err) {
    console.warn('Warning: Could not connect to the database. History recording will fail, but the server will still run.');
  }
  
  server.listen(PORT, () => console.log(`BMS backend running on port ${PORT}`));
}

start().catch(console.error);
