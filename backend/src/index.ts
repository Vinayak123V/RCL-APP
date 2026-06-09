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

import { Resend } from 'resend';
const resend = new Resend('re_Lkjv46oj_57v1Dtv73rL6vCegMpb3ohio');

// In-memory OTP store (email -> { otp, expiresAt })
const otpStore = new Map<string, { otp: string; expiresAt: number }>();

// Raise Ticket Endpoint
app.post('/ticket', async (req, res) => {
  const { issue, userInfo } = req.body;
  try {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #0056b3; border-bottom: 2px solid #0056b3; padding-bottom: 10px;">ASTRA App - New Issue Ticket</h2>
        <p><strong>Date & Time:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'medium' })}</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #d9534f;">
          <h3 style="margin-top: 0; color: #d9534f; font-size: 18px;">Issue Description</h3>
          <p style="white-space: pre-wrap; font-size: 15px; line-height: 1.5;">${issue}</p>
        </div>
        
        <div style="background-color: #f0f8ff; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #31708f;">
          <h3 style="margin-top: 0; color: #31708f; font-size: 18px;">User Information</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            ${userInfo ? Object.entries(userInfo).map(([key, value]) => {
              let displayValue = value;
              if (key === 'timestamp' && value) {
                displayValue = new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'medium' });
              }
              return `
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold; width: 35%; color: #555; text-transform: capitalize;">${key.replace(/([A-Z])/g, ' $1').trim()}</td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd; word-break: break-all; color: #333;">${displayValue}</td>
              </tr>
              `;
            }).join('') : '<tr><td>No user info provided.</td></tr>'}
          </table>
        </div>
        
        <p style="font-size: 12px; color: #777; text-align: center; margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px;">
          This is an automated message generated from the ASTRA application.<br>Please do not reply directly to this email.
        </p>
      </div>
    `;

    const { data, error } = await resend.emails.send({
      from: 'ASTRA System <onboarding@resend.dev>',
      to: ['hosurv45@gmail.com'],
      subject: 'New Issue Ticket Raised from ASTRA App',
      html: htmlContent,
    });

    if (error) {
      console.error('Resend API Error:', error);
      return res.status(500).json({ success: false, error: 'Failed to raise ticket' });
    }

    res.json({ success: true, message: 'Ticket raised successfully', data });
  } catch (error) {
    console.error('Error sending ticket:', error);
    res.status(500).json({ success: false, error: 'Failed to raise ticket' });
  }
});

// Send OTP Endpoint
app.post('/otp/send', async (req, res) => {
  const { email, name } = req.body;
  if (!email) return res.status(400).json({ success: false, error: 'Email is required' });

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  // Store it with a 10-minute expiration
  otpStore.set(email.toLowerCase(), { otp, expiresAt: Date.now() + 10 * 60 * 1000 });

  try {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2>ASTRA App Registration</h2>
        <p>Hello ${name || 'User'},</p>
        <p>Your OTP for registration is: <strong style="font-size: 24px; color: #0056b3;">${otp}</strong></p>
        <p>This OTP will expire in 10 minutes. Please do not share it with anyone.</p>
      </div>
    `;

    const { error } = await resend.emails.send({
      from: 'ASTRA System <onboarding@resend.dev>',
      to: [email],
      subject: 'Your ASTRA Registration OTP',
      html: htmlContent,
    });

    if (error) {
      console.error('Resend OTP Error:', error);
      return res.status(500).json({ success: false, error: 'Failed to send OTP email' });
    }

    res.json({ success: true, message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ success: false, error: 'Failed to send OTP' });
  }
});

// Verify OTP Endpoint
app.post('/otp/verify', (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ success: false, error: 'Email and OTP are required' });

  const record = otpStore.get(email.toLowerCase());
  if (!record) {
    return res.status(400).json({ success: false, error: 'OTP not found or expired' });
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(email.toLowerCase());
    return res.status(400).json({ success: false, error: 'OTP has expired' });
  }

  if (record.otp !== otp) {
    return res.status(400).json({ success: false, error: 'Invalid OTP' });
  }

  // OTP verified successfully
  otpStore.delete(email.toLowerCase());
  res.json({ success: true, message: 'OTP verified successfully' });
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
