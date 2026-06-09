const nodemailer = require('nodemailer');

async function test() {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'vinayakhosur85@gmail.com',
        pass: 'nowxkyjmvgcfptsp', // REMOVED SPACES!
      },
    });

    const mailOptions = {
      from: 'vinayakhosur85@gmail.com',
      to: 'hosurv45@gmail.com',
      subject: 'Test',
      text: 'Test message'
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Success:', info.response);
  } catch (error) {
    console.error('Error:', error);
  }
}

test();
