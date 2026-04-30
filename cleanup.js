#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const ARCHIVE_EXTENSIONS = ['.7z', '.zip', '.rar', '.tar', '.gz'];

/**
 * Finds all archive files and their parts in the current directory
 * @returns {string[]} Array of archive file paths
 */
function findArchiveFiles() {
    const files = fs.readdirSync(process.cwd());
    const archiveFiles = [];

    files.forEach(file => {
        // Check for archive extensions
        const hasArchiveExt = ARCHIVE_EXTENSIONS.some(ext => file.includes(ext));

        // Check for split archive patterns (.7z.001, .7z.002, etc.)
        const isSplitArchive = /\.(7z|zip|rar)\.\d{3}$/.test(file);

        if (hasArchiveExt || isSplitArchive) {
            archiveFiles.push(file);
        }
    });

    return archiveFiles;
}

/**
 * Deletes files with confirmation
 * @param {string[]} files - Array of file paths to delete
 */
function deleteFiles(files) {
    if (files.length === 0) {
        console.log('✅ No archive files found to delete.');
        return;
    }

    console.log(`\n📋 Found ${files.length} archive file(s):\n`);
    files.forEach(file => {
        const stats = fs.statSync(file);
        const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
        console.log(`  - ${file} (${sizeMB} MB)`);
    });

    console.log('\n🗑️  Starting deletion...\n');

    let deletedCount = 0;
    let failedCount = 0;

    files.forEach(file => {
        try {
            fs.unlinkSync(file);
            console.log(`✅ Deleted: ${file}`);
            deletedCount++;
        } catch (error) {
            console.error(`❌ Failed to delete ${file}: ${error.message}`);
            failedCount++;
        }
    });

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Successfully deleted: ${deletedCount}`);
    if (failedCount > 0) {
        console.log(`   ❌ Failed: ${failedCount}`);
    }
    console.log('\n✨ Cleanup completed!');
}

/**
 * Main execution
 */
function main() {
    console.log('🔍 Searching for archive files...');

    const archiveFiles = findArchiveFiles();
    deleteFiles(archiveFiles);
}

main();
