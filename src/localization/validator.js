const fs = require('fs-extra');
const path = require('path');
const chokidar = require('chokidar');

const COMPILED_DIR = path.join(__dirname, 'compiled');

// Function to get all keys from an object (including nested ones)
function getAllKeys(obj, prefix = '', result = new Set()) {
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    result.add(fullKey);

    if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
      getAllKeys(obj[key], fullKey, result);
    }
  }

  return result;
}

// Check if a key exists in an object
function keyExists(obj, keyPath) {
  const parts = keyPath.split('.');
  let current = obj;

  for (const part of parts) {
    if (current[part] === undefined) {
      return false;
    }
    current = current[part];
  }

  return true;
}

// Get value from nested object using dot notation
function getValue(obj, keyPath) {
  const parts = keyPath.split('.');
  let current = obj;

  for (const part of parts) {
    if (current[part] === undefined) {
      return undefined;
    }
    current = current[part];
  }

  return current;
}

// Function to validate translations
function validateTranslations() {
  console.log('🔍 Validating translation files...');

  // Read all compiled JSON files
  const files = fs.readdirSync(COMPILED_DIR).filter(file => file.endsWith('.json'));

  if (files.length === 0) {
    console.log('⚠️  No compiled translation files found');
    return;
  }

  // Load all translation data
  const translations = {};
  for (const file of files) {
    const locale = path.basename(file, '.json');
    const filePath = path.join(COMPILED_DIR, file);
    translations[locale] = fs.readJsonSync(filePath);
  }

  // Get all locales
  const locales = Object.keys(translations);
  console.log(`📁 Found ${locales.length} locales: ${locales.join(', ')}`);

  if (locales.length < 2) {
    console.log('⚠️  Need at least 2 locales to compare');
    return;
  }

  // Choose the first locale as reference
  const referenceLocale = locales[0];
  console.log(`🔑 Using ${referenceLocale} as reference locale`);

  // Get all keys from reference locale
  const referenceKeys = getAllKeys(translations[referenceLocale]);
  console.log(`🔢 Reference locale has ${referenceKeys.size} unique keys`);

  // Track statistics
  const stats = {
    missingKeys: {},
    extraKeys: {},
    typeErrors: {}
  };

  // Initialize stats for each locale
  for (const locale of locales) {
    if (locale !== referenceLocale) {
      stats.missingKeys[locale] = [];
      stats.extraKeys[locale] = [];
      stats.typeErrors[locale] = [];
    }
  }

  // Check each locale against the reference
  for (const locale of locales) {
    if (locale === referenceLocale) continue;

    const localeKeys = getAllKeys(translations[locale]);

    // Check for missing keys
    for (const key of referenceKeys) {
      if (!keyExists(translations[locale], key)) {
        stats.missingKeys[locale].push(key);
      } else {
        // Check for type mismatches
        const refValue = getValue(translations[referenceLocale], key);
        const localeValue = getValue(translations[locale], key);

        if (typeof refValue !== typeof localeValue) {
          stats.typeErrors[locale].push({
            key,
            refType: typeof refValue,
            localeType: typeof localeValue
          });
        }
      }
    }

    // Check for extra keys
    for (const key of localeKeys) {
      if (!keyExists(translations[referenceLocale], key)) {
        stats.extraKeys[locale].push(key);
      }
    }
  }

  // Print results
  let hasIssues = false;

  // Print missing keys
  for (const locale in stats.missingKeys) {
    const missing = stats.missingKeys[locale];
    if (missing.length > 0) {
      hasIssues = true;
      console.log(`❌ ${locale} is missing ${missing.length} keys:`);
      missing.forEach(key => {
        console.log(`   - ${key}`);
      });
    }
  }

  // Print extra keys
  for (const locale in stats.extraKeys) {
    const extra = stats.extraKeys[locale];
    if (extra.length > 0) {
      hasIssues = true;
      console.log(`⚠️  ${locale} has ${extra.length} extra keys:`);
      extra.forEach(key => {
        console.log(`   - ${key}`);
      });
    }
  }

  // Print type errors
  for (const locale in stats.typeErrors) {
    const typeErrors = stats.typeErrors[locale];
    if (typeErrors.length > 0) {
      hasIssues = true;
      console.log(`⚠️  ${locale} has ${typeErrors.length} type mismatches:`);
      typeErrors.forEach(err => {
        console.log(`   - ${err.key}: expected ${err.refType}, got ${err.localeType}`);
      });
    }
  }

  // Print empty values check if needed
  console.log('\n📊 Checking for empty values...');
  for (const locale of locales) {
    checkEmptyValues(translations[locale], locale);
  }

  if (!hasIssues) {
    console.log('✅ All locales have consistent structure!');
  }

  return hasIssues;
}

// Function to check for empty values
function checkEmptyValues(obj, locale, prefix = '') {
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];

    if (value === '') {
      console.log(`⚠️  ${locale} has empty string at ${fullKey}`);
    } else if (value === null) {
      console.log(`⚠️  ${locale} has null value at ${fullKey}`);
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      checkEmptyValues(value, locale, fullKey);
    }
  }
}

// Main function
function main() {
  // Create compiled directory if it doesn't exist
  fs.ensureDirSync(COMPILED_DIR);

  // Run validation
  validateTranslations();
}

// Watch mode
if (process.argv.includes('--watch')) {
  console.log('👀 Watching for changes...');

  let debounceTimer;
  const debounceDelay = 100;

  // Initial validation
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    main();
  }, debounceDelay);

  // Watch for changes in the compiled directory
  chokidar.watch(COMPILED_DIR, {
	  ignoreInitial: true,
	  ignored: /.*~$/, // Игнорировать скрытые файлы
  }).on('all', (event, path) => {
    if (event === 'change' || event === 'add' || event === 'unlink') {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        console.log(`🔁 Detected changes in ${path} (${event}), revalidating...`);
        main();
      }, debounceDelay);
    }
  });
} else {
  // Run once
  main();
}
