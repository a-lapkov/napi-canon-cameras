#!/usr/bin/env node

/**
 * setup-sdk.js - EDSDK setup script for napi-canon-cameras
 *
 * This script sets up the Canon EDSDK in the third_party directory so that
 * binding.gyp can find headers and libraries during compilation.
 *
 * Resolution order:
 *   1. If the EDSDK directory already exists and has content, skip setup (idempotent).
 *   2. Check EDSDK_PATH environment variable for an external SDK location.
 *   3. Check ../../sdk/ relative to this script (i.e. native/sdk/ from the project root).
 *   4. Fall back to looking for a zip file already present in third_party/.
 *   5. If nothing found, print instructions and exit with an error.
 *
 * The script creates the directory structure expected by binding.gyp:
 *   macOS:   EDSDKv{version}M/macos/EDSDK/{Header,Framework}
 *   Windows: EDSDKv{version}W/Windows/{EDSDK,EDSDK_64}/{Header,Dll,Library}
 *   Linux:   EDSDKv{version}L/linux/EDSDK/{Header,Library}
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

// This must match the edsdk_version variable in binding.gyp.
// binding.gyp currently uses "13180" for the existing SDK.
// We read it from binding.gyp if possible, but default to a known value.
const EDSDK_VERSION_BINDING = '13180';

const THIRD_PARTY_DIR = __dirname;
const CAMERA_MODULE_DIR = path.dirname(THIRD_PARTY_DIR);
const EXTERNAL_SDK_DIR = path.resolve(THIRD_PARTY_DIR, '..', '..', 'sdk');

const PLATFORM = process.platform; // 'darwin', 'win32', 'linux'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function log(msg) {
  console.log(`[setup-sdk] ${msg}`);
}

function warn(msg) {
  console.warn(`[setup-sdk] WARNING: ${msg}`);
}

function error(msg) {
  console.error(`[setup-sdk] ERROR: ${msg}`);
}

/**
 * Checks whether a directory exists and contains at least one entry.
 */
function dirExistsAndNotEmpty(dirPath) {
  try {
    const stat = fs.statSync(dirPath);
    if (!stat.isDirectory()) return false;
    const entries = fs.readdirSync(dirPath);
    return entries.length > 0;
  } catch {
    return false;
  }
}

/**
 * Recursively creates a directory (like mkdir -p).
 */
function mkdirp(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

/**
 * Copies a directory recursively, preserving symlinks.
 */
function copyDirRecursive(src, dest) {
  mkdirp(dest);
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isSymbolicLink()) {
      const linkTarget = fs.readlinkSync(srcPath);
      try {
        fs.symlinkSync(linkTarget, destPath);
      } catch (e) {
        if (e.code !== 'EEXIST') throw e;
      }
    } else if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
      // Preserve executable permissions
      const srcStat = fs.statSync(srcPath);
      fs.chmodSync(destPath, srcStat.mode);
    }
  }
}

/**
 * Find a matching SDK zip file in a directory.
 * Returns the full path or null.
 */
function findSdkZip(dir, platformKey) {
  try {
    const files = fs.readdirSync(dir);
    // Look for EDSDK_v*_{platformKey}.zip
    const match = files.find(f =>
      f.startsWith('EDSDK_v') && f.endsWith(`_${platformKey}.zip`)
    );
    return match ? path.join(dir, match) : null;
  } catch {
    return null;
  }
}

/**
 * Extracts a zip file to a destination directory using the system unzip command.
 */
function unzipTo(zipPath, destDir) {
  mkdirp(destDir);
  log(`Extracting ${path.basename(zipPath)} to ${destDir}`);
  execSync(`unzip -o -q "${zipPath}" -d "${destDir}"`, { stdio: 'inherit' });
}

/**
 * Extract the EDSDK version string (like "131910") from the zip filename.
 * E.g. "EDSDK_v13.19.10_Windows.zip" -> "131910"
 */
function extractVersionFromZipName(zipPath) {
  const basename = path.basename(zipPath);
  const match = basename.match(/EDSDK_v(\d+)\.(\d+)\.(\d+)/);
  if (match) {
    return `${match[1]}${match[2]}${match[3]}`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Platform-specific setup functions
// ---------------------------------------------------------------------------

/**
 * macOS: The external zip contains Macintosh.dmg.zip which contains a DMG.
 * We need to:
 *   1. Extract the outer zip to get Macintosh.dmg.zip
 *   2. Extract Macintosh.dmg.zip to get Macintosh.dmg
 *   3. Mount the DMG
 *   4. Copy the EDSDK folder from the mounted volume
 *   5. Unmount the DMG
 *   6. Place files in EDSDKv{version}M/macos/EDSDK/
 */
function setupMacOS(zipPath, edsdkVersion) {
  const targetDir = path.join(THIRD_PARTY_DIR, `EDSDKv${edsdkVersion}M`);
  const targetEdsdkDir = path.join(targetDir, 'macos', 'EDSDK');

  // Check if already set up
  if (dirExistsAndNotEmpty(path.join(targetEdsdkDir, 'Header')) &&
      dirExistsAndNotEmpty(path.join(targetEdsdkDir, 'Framework', 'EDSDK.framework'))) {
    log(`macOS SDK already set up at ${targetDir}`);
    return true;
  }

  log('Setting up macOS EDSDK...');

  // Create a temporary extraction directory
  const tmpDir = path.join(THIRD_PARTY_DIR, '.sdk-setup-tmp');
  try {
    mkdirp(tmpDir);

    // Step 1: Extract the outer zip
    unzipTo(zipPath, tmpDir);

    // Step 2: Find and extract Macintosh.dmg.zip
    const dmgZipPath = path.join(tmpDir, 'Macintosh.dmg.zip');
    if (!fs.existsSync(dmgZipPath)) {
      error('Could not find Macintosh.dmg.zip inside the SDK archive');
      return false;
    }

    unzipTo(dmgZipPath, tmpDir);

    // Step 3: Find the DMG file
    const dmgPath = path.join(tmpDir, 'Macintosh.dmg');
    if (!fs.existsSync(dmgPath)) {
      error('Could not find Macintosh.dmg after extraction');
      return false;
    }

    // Step 4: Mount the DMG
    log('Mounting Macintosh.dmg...');
    const mountOutput = execSync(`hdiutil attach "${dmgPath}" -nobrowse -readonly`, {
      encoding: 'utf-8'
    });

    // Parse mount point from hdiutil output
    // The last line typically contains the mount point
    const mountLines = mountOutput.trim().split('\n');
    let mountPoint = null;
    for (const line of mountLines) {
      const parts = line.split('\t');
      if (parts.length >= 3) {
        mountPoint = parts[parts.length - 1].trim();
      }
    }

    if (!mountPoint || !fs.existsSync(mountPoint)) {
      error(`Could not determine mount point from hdiutil output: ${mountOutput}`);
      return false;
    }

    log(`DMG mounted at: ${mountPoint}`);

    try {
      // Step 5: Find the EDSDK folder on the mounted volume
      const edsdkSource = path.join(mountPoint, 'EDSDK');
      if (!fs.existsSync(edsdkSource)) {
        error(`EDSDK folder not found at ${edsdkSource}`);
        return false;
      }

      // Step 6: Copy EDSDK to the target location
      mkdirp(path.join(targetDir, 'macos'));
      log(`Copying EDSDK to ${targetEdsdkDir}...`);
      copyDirRecursive(edsdkSource, targetEdsdkDir);

      log('macOS SDK setup complete.');
      return true;
    } finally {
      // Step 7: Always unmount the DMG
      log('Unmounting DMG...');
      try {
        execSync(`hdiutil detach "${mountPoint}" -quiet`, { stdio: 'inherit' });
      } catch (e) {
        warn(`Failed to unmount DMG: ${e.message}`);
      }
    }
  } finally {
    // Clean up tmp directory
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      warn(`Could not clean up temporary directory: ${tmpDir}`);
    }
  }
}

/**
 * Windows: The zip contains EDSDK/ and EDSDK_64/ at the top level
 * with Header, Dll, Library subdirectories.
 * We need to place them under EDSDKv{version}W/Windows/
 */
function setupWindows(zipPath, edsdkVersion) {
  const targetDir = path.join(THIRD_PARTY_DIR, `EDSDKv${edsdkVersion}W`);
  const targetWindowsDir = path.join(targetDir, 'Windows');

  // Check if already set up
  if (dirExistsAndNotEmpty(path.join(targetWindowsDir, 'EDSDK', 'Header')) &&
      dirExistsAndNotEmpty(path.join(targetWindowsDir, 'EDSDK_64', 'Dll'))) {
    log(`Windows SDK already set up at ${targetDir}`);
    return true;
  }

  log('Setting up Windows EDSDK...');

  // The Windows zip contains EDSDK/ and EDSDK_64/ at the top level.
  // We extract directly into the Windows/ directory.
  mkdirp(targetWindowsDir);
  unzipTo(zipPath, targetWindowsDir);

  // The zip also contains a sample/ directory we don't need; remove it if present
  const sampleDir = path.join(targetWindowsDir, 'sample');
  if (fs.existsSync(sampleDir)) {
    fs.rmSync(sampleDir, { recursive: true, force: true });
  }

  // Remove any PDF or text files extracted at the top level
  for (const file of ['EDSDK_API_EN.pdf', 'readme.txt', 'ReleaseNote.txt']) {
    const filePath = path.join(targetWindowsDir, file);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  // Verify the expected structure
  if (!dirExistsAndNotEmpty(path.join(targetWindowsDir, 'EDSDK', 'Header'))) {
    error('Windows SDK extraction did not produce expected EDSDK/Header directory');
    return false;
  }

  log('Windows SDK setup complete.');
  return true;
}

/**
 * Linux: The zip contains EDSDK/ at the top level with Header and Library.
 * We need to place them under EDSDKv{version}L/linux/EDSDK/
 *
 * Note: binding.gyp does not currently have a Linux condition,
 * but we set up the structure for future use.
 */
function setupLinux(zipPath, edsdkVersion) {
  const targetDir = path.join(THIRD_PARTY_DIR, `EDSDKv${edsdkVersion}L`);
  const targetLinuxDir = path.join(targetDir, 'linux');
  const targetEdsdkDir = path.join(targetLinuxDir, 'EDSDK');

  // Check if already set up
  if (dirExistsAndNotEmpty(path.join(targetEdsdkDir, 'Header')) &&
      dirExistsAndNotEmpty(path.join(targetEdsdkDir, 'Library'))) {
    log(`Linux SDK already set up at ${targetDir}`);
    return true;
  }

  log('Setting up Linux EDSDK...');

  // Extract to a temporary location first, then move into place
  const tmpDir = path.join(THIRD_PARTY_DIR, '.sdk-setup-tmp');
  try {
    mkdirp(tmpDir);
    unzipTo(zipPath, tmpDir);

    // The zip extracts EDSDK/ at the top level
    const extractedEdsdk = path.join(tmpDir, 'EDSDK');
    if (!fs.existsSync(extractedEdsdk)) {
      error('Linux SDK extraction did not produce expected EDSDK directory');
      return false;
    }

    mkdirp(targetLinuxDir);
    copyDirRecursive(extractedEdsdk, targetEdsdkDir);

    log('Linux SDK setup complete.');
    return true;
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      warn(`Could not clean up temporary directory: ${tmpDir}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  log(`Platform: ${PLATFORM}`);
  log(`Third-party directory: ${THIRD_PARTY_DIR}`);

  // Determine platform key for zip filename matching
  let platformKey;
  let setupFn;
  let dirSuffix;

  switch (PLATFORM) {
    case 'darwin':
      platformKey = 'Macintosh';
      setupFn = setupMacOS;
      dirSuffix = 'M';
      break;
    case 'win32':
      platformKey = 'Windows';
      setupFn = setupWindows;
      dirSuffix = 'W';
      break;
    case 'linux':
      platformKey = 'Linux';
      setupFn = setupLinux;
      dirSuffix = 'L';
      break;
    default:
      error(`Unsupported platform: ${PLATFORM}`);
      process.exit(1);
  }

  // Step 1: Check if EDSDK is already set up with the binding.gyp version
  const existingDir = path.join(THIRD_PARTY_DIR, `EDSDKv${EDSDK_VERSION_BINDING}${dirSuffix}`);
  if (isEdsdkSetUp(existingDir, PLATFORM)) {
    log(`EDSDK already set up at ${existingDir}. Nothing to do.`);
    return;
  }

  // Step 2: Find an SDK zip file
  let zipPath = null;
  let edsdkVersion = null;

  // 2a: Check EDSDK_PATH environment variable
  const envPath = process.env.EDSDK_PATH;
  if (envPath) {
    log(`Checking EDSDK_PATH environment variable: ${envPath}`);
    if (fs.existsSync(envPath) && fs.statSync(envPath).isDirectory()) {
      zipPath = findSdkZip(envPath, platformKey);
      if (zipPath) {
        log(`Found SDK zip via EDSDK_PATH: ${zipPath}`);
      }
    } else if (fs.existsSync(envPath) && envPath.endsWith('.zip')) {
      // EDSDK_PATH points directly to a zip file
      zipPath = envPath;
      log(`EDSDK_PATH points to zip file: ${zipPath}`);
    }
  }

  // 2b: Check ../../sdk/ relative path (native/sdk/ from project root)
  if (!zipPath) {
    log(`Checking external SDK directory: ${EXTERNAL_SDK_DIR}`);
    zipPath = findSdkZip(EXTERNAL_SDK_DIR, platformKey);
    if (zipPath) {
      log(`Found SDK zip at external location: ${zipPath}`);
    }
  }

  // 2c: Check for zip already in third_party/
  if (!zipPath) {
    log('Checking for SDK zip in third_party/...');
    zipPath = findSdkZip(THIRD_PARTY_DIR, platformKey);
    if (zipPath) {
      log(`Found SDK zip in third_party: ${zipPath}`);
    }
  }

  // Step 3: If no zip found, provide instructions
  if (!zipPath) {
    error('Could not find Canon EDSDK zip archive.');
    console.error('');
    console.error('Please provide the EDSDK in one of the following ways:');
    console.error(`  1. Set EDSDK_PATH environment variable to a directory containing EDSDK_v*_${platformKey}.zip`);
    console.error(`  2. Place the zip file in ${EXTERNAL_SDK_DIR}/`);
    console.error(`  3. Place the zip file in ${THIRD_PARTY_DIR}/`);
    console.error('');
    console.error('You can download the EDSDK from: https://developercommunity.usa.canon.com/s/');
    process.exit(1);
  }

  // Step 4: Extract version from zip name
  edsdkVersion = extractVersionFromZipName(zipPath);
  if (!edsdkVersion) {
    warn(`Could not extract version from zip name: ${path.basename(zipPath)}`);
    edsdkVersion = EDSDK_VERSION_BINDING;
    warn(`Falling back to binding.gyp version: ${edsdkVersion}`);
  }

  // Check if this version is already set up
  const versionDir = path.join(THIRD_PARTY_DIR, `EDSDKv${edsdkVersion}${dirSuffix}`);
  if (isEdsdkSetUp(versionDir, PLATFORM)) {
    log(`EDSDK v${edsdkVersion} already set up at ${versionDir}. Nothing to do.`);
    return;
  }

  // If the zip version differs from binding.gyp version, inform the user
  if (edsdkVersion !== EDSDK_VERSION_BINDING) {
    warn(`SDK zip version (${edsdkVersion}) differs from binding.gyp version (${EDSDK_VERSION_BINDING}).`);
    warn('You may need to update edsdk_version in binding.gyp to match.');
  }

  // Step 5: Run platform-specific setup
  const success = setupFn(zipPath, edsdkVersion);
  if (!success) {
    error('SDK setup failed.');
    process.exit(1);
  }

  log('EDSDK setup completed successfully.');
}

/**
 * Checks if the EDSDK is already properly set up at the given directory.
 */
function isEdsdkSetUp(edsdkDir, platform) {
  switch (platform) {
    case 'darwin':
      return (
        dirExistsAndNotEmpty(path.join(edsdkDir, 'macos', 'EDSDK', 'Header')) &&
        dirExistsAndNotEmpty(path.join(edsdkDir, 'macos', 'EDSDK', 'Framework', 'EDSDK.framework'))
      );
    case 'win32':
      return (
        dirExistsAndNotEmpty(path.join(edsdkDir, 'Windows', 'EDSDK', 'Header')) &&
        (
          dirExistsAndNotEmpty(path.join(edsdkDir, 'Windows', 'EDSDK_64', 'Dll')) ||
          dirExistsAndNotEmpty(path.join(edsdkDir, 'Windows', 'EDSDK', 'Dll'))
        )
      );
    case 'linux':
      return (
        dirExistsAndNotEmpty(path.join(edsdkDir, 'linux', 'EDSDK', 'Header')) &&
        dirExistsAndNotEmpty(path.join(edsdkDir, 'linux', 'EDSDK', 'Library'))
      );
    default:
      return false;
  }
}

// Run
main();
