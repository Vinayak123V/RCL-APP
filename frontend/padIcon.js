const sharp = require('sharp');
const fs = require('fs');

async function processIcon() {
    try {
        const inputPath = 'C:\\ASTRA\\frontend\\public\\assets\\astra-logo.png';
        const outputPath = 'C:\\ASTRA\\frontend\\assets\\icon.png';
        const fgPath = 'C:\\ASTRA\\frontend\\assets\\icon-foreground.png';
        const bgPath = 'C:\\ASTRA\\frontend\\assets\\icon-background.png';

        if (!fs.existsSync(inputPath)) {
            console.error('Image not found');
            return;
        }

        // Generate the main icon (1024x1024 with black background)
        await sharp(inputPath)
            .resize(800, 800, {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .extend({
                top: 112,
                bottom: 112,
                left: 112,
                right: 112,
                background: { r: 0, g: 0, b: 0, alpha: 1 }
            })
            .toFile(outputPath);

        // Generate icon-foreground (1024x1024 transparent background)
        await sharp(inputPath)
            .resize(800, 800, {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .extend({
                top: 112,
                bottom: 112,
                left: 112,
                right: 112,
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .toFile(fgPath);

        // Generate icon-background (solid black)
        await sharp({
            create: {
                width: 1024,
                height: 1024,
                channels: 4,
                background: { r: 0, g: 0, b: 0, alpha: 1 }
            }
        }).png().toFile(bgPath);

        console.log('Icons generated successfully.');
    } catch (error) {
        console.error('Error generating icons:', error);
    }
}

processIcon();
