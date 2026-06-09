const sharp = require('sharp');

async function processIcon() {
    try {
        const inputPath = 'C:\\ASTRA\\frontend\\public\\icon.png';
        const outAppIcon = 'C:\\ASTRA\\frontend\\public\\app-icon.png';
        const outAssetsIcon = 'C:\\ASTRA\\frontend\\assets\\icon.png';
        
        // Resize to 512x512 (fit, maintaining aspect ratio, transparent padding if needed)
        await sharp(inputPath)
            .resize(512, 512, {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .toFile(outAppIcon);
            
        await sharp(inputPath)
            .resize(512, 512, {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .toFile(outAssetsIcon);

        console.log('Successfully resized icons to 512x512.');
    } catch (error) {
        console.error('Error resizing icons:', error);
    }
}

processIcon();
