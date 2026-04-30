#!/usr/bin/env node

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { URL } = require('url');

// دریافت آرگیومنت‌ها
const args = process.argv.slice(2);
const downloadUrl = args[0];
const password = args[1] || 'default_password_123';

if (!downloadUrl) {
    console.error('❌ لطفا لینک دانلود را وارد کنید');
    console.error('استفاده: node downloader.js <URL> [PASSWORD]');
    process.exit(1);
}

// بررسی وجود 7zip
function check7zip() {
    try {
        execSync('7z', { stdio: 'ignore' });
        return '7z';
    } catch {
        try {
            execSync('7za', { stdio: 'ignore' });
            return '7za';
        } catch {
            console.error('❌ 7zip یافت نشد. لطفا نصب کنید: apt-get install p7zip-full');
            process.exit(1);
        }
    }
}

const sevenZipCmd = check7zip();

// دانلود فایل
function downloadFile(url, outputPath) {
    return new Promise((resolve, reject) => {

        const parsedUrl = new URL(url);
        const protocol = parsedUrl.protocol === 'https:' ? https : http;

        const file = fs.createWriteStream(outputPath);
        let downloadedSize = 0;

        protocol.get(url, (response) => {
            if (response.statusCode === 302 || response.statusCode === 301) {
                file.close();
                fs.unlinkSync(outputPath);
                return downloadFile(response.headers.location, outputPath)
                    .then(resolve)
                    .catch(reject);
            }

            if (response.statusCode !== 200) {
                reject(new Error(`Error: ${response.statusCode}`));
                return;
            }

            const totalSize = parseInt(response.headers['content-length'], 10);

            response.on('data', (chunk) => {
                downloadedSize += chunk.length;
                if (totalSize) {
                    const percent = ((downloadedSize / totalSize) * 100).toFixed(2);
                    process.stdout.write(`\r📊 Progress: ${percent}% (${(downloadedSize / 1024 / 1024).toFixed(2)} MB)`);
                }
            });

            response.pipe(file);

            file.on('finish', () => {
                file.close();
                console.log('\n✅ Download completed');
                resolve(outputPath);
            });
        }).on('error', (err) => {
            fs.unlinkSync(outputPath);
            reject(err);
        });
    });
}

// فشرده‌سازی با 7zip
function compressFile(inputFile, password) {
    console.log('\n🗜️  Compressing...');

    const outputBase = path.basename(inputFile, path.extname(inputFile));
    const outputArchive = `${outputBase}.7z`;

    try {
        // فشرده‌سازی با پارت‌های 50MB و رمز عبور
        const cmd = `${sevenZipCmd} a -t7z -v50m -p"${password}" -mhe=on "${outputArchive}" "${inputFile}"`;
        console.log('🔐 Splitting to 50MB...');

        execSync(cmd, { stdio: 'inherit' });

        console.log('✅ Spliting Completed');

        // لیست فایل‌های پارت شده
        const parts = fs.readdirSync('.')
            .filter(f => f.startsWith(outputBase) && f.includes('.7z'));

        return parts;
    } catch (error) {
        console.error('❌ خطا در فشرده‌سازی:', error.message);
        process.exit(1);
    }
}

// اجرای اصلی
async function main() {
    try {
        const parsedUrl = new URL(downloadUrl);
        const fileName = path.basename(parsedUrl.pathname) || 'downloaded_file';
        const outputPath = path.join(process.cwd(), fileName);

        // دانلود
        await downloadFile(downloadUrl, outputPath);

        // فشرده‌سازی
        const parts = compressFile(outputPath, password);

        console.log('\n📦 Created files:');
        parts.forEach(part => console.log(`  - ${part}`));

        // حذف فایل اصلی
        fs.unlinkSync(outputPath);
        console.log('\n🗑️  Main file deleted');

        console.log('\n✨ Operation completed!');
    } catch (error) {
        console.error('\n❌ خطا:', error.message);
        process.exit(1);
    }
}

main();
