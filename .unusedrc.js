// .unusedrc.js - Configuration for unused code detector
module.exports = {
  // Additional paths to ignore (merged with default patterns)
  ignorePatterns: [
    // 'libs/shared/',
    // 'example/',
    // 'demo/'
  ],

  // Additional file patterns to ignore (merged with built-in patterns)
  ignoredFilePatterns: [
    // 'custom.config.js',
    // 'setup.ts',
    // 'test-utils.ts'

    // Service files with utility methods that might be unused but kept for API completeness
    'libs/blockchain/src/nonce-manager.service.ts',
    'libs/blockchain/src/transaction.service.ts',
    'libs/queue/src/domain/interfaces/queue.service.interface.ts',
    'libs/req/src/req.service.ts',
    'libs/req/src/req.interceptor.ts',
    'libs/shared/src/address.ts',
  ],

  // Function name patterns to ignore (regex patterns)
  ignoredFunctionPatterns: [
    // /^setup.*$/,        // Functions starting with 'setup'
    // /^teardown.*$/,     // Functions starting with 'teardown'
    // /^helper.*$/,       // Helper functions
    // /^util.*$/,         // Utility functions
    // /.*Handler$/,       // Event handlers
    // /.*Callback$/       // Callback functions
  ],

  // Class name patterns to ignore (regex patterns)
  ignoredClassPatterns: [
    // /^.*Mock$/,         // Mock classes
    // /^.*Stub$/,         // Stub classes
    // /^Test.*$/,         // Test classes
    // /^.*Config$/        // Configuration classes
  ],

  // Method name patterns to ignore (regex patterns)
  ignoredMethodPatterns: [
    // /^_.*$/,            // Private methods starting with _
    // /^setup.*$/,        // Setup methods
    // /^teardown.*$/,     // Teardown methods
    // /^handle.*$/,       // Handler methods
    // /^on.*$/            // Event handler methods starting with 'on'
    /^process$/, // Bu
  ],
}
