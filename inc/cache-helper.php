<?php
// /aaguitarsuite/inc/cache_helpers.php

/**
 * Gets cached data for a given key.
 *
 * @param string $cache_key A unique identifier for the cached data.
 * @param int $ttl Time To Live in seconds (e.g., 3600 for 1 hour).
 * @return mixed|false The cached data (decoded from JSON), or false if not found or expired.
 */
function get_cached_data(string $cache_key, int $ttl)
{
    $cache_dir = __DIR__ . '/../cache/';
    $cache_file = $cache_dir . md5($cache_key) . '.json'; // Use MD5 for a safe filename

    // Check if cache file exists
    if (!file_exists($cache_file)) {
        return false;
    }

    // Check if cache is still fresh
    $file_mod_time = filemtime($cache_file); // Get last modification time
    if ($file_mod_time === false || (time() - $file_mod_time) > $ttl) {
        // Cache expired or unable to get file modification time
        unlink($cache_file); // Delete expired cache
        return false;
    }

    // Read and decode cached data
    $data = file_get_contents($cache_file);
    if ($data === false) {
        return false; // Could not read file
    }

    $decoded_data = json_decode($data, true); // Decode as associative array
    if (json_last_error() !== JSON_ERROR_NONE) {
        // Cache file corrupted, delete it
        unlink($cache_file);
        return false;
    }

    return $decoded_data;
}

/**
 * Stores data in the cache for a given key.
 *
 * @param string $cache_key A unique identifier for the cached data.
 * @param mixed $data The data to cache (will be JSON encoded).
 * @return bool True on success, false on failure.
 */
function set_cached_data(string $cache_key, $data): bool
{
    $cache_dir = __DIR__ . '/../cache/';
    // Ensure cache directory exists
    if (!is_dir($cache_dir)) {
        mkdir($cache_dir, 0775, true); // Create directory with permissions (recursive)
    }

    $cache_file = $cache_dir . md5($cache_key) . '.json'; // Use MD5 for a safe filename

    $encoded_data = json_encode($data, JSON_PRETTY_PRINT);
    if ($encoded_data === false) {
        error_log("Error encoding data for cache key: " . $cache_key . " - " . json_last_error_msg());
        return false;
    }

    // Use FILE_LOCK to prevent race conditions during write (optional but good practice)
    return file_put_contents($cache_file, $encoded_data, LOCK_EX) !== false;
}

/**
 * Clears a specific item from the cache.
 * @param string $cache_key The key of the item to clear.
 * @return bool True on success, false if file did not exist or could not be deleted.
 */
function clear_cached_item(string $cache_key): bool {
    $cache_dir = __DIR__ . '/../cache/';
    $cache_file = $cache_dir . md5($cache_key) . '.json';
    if (file_exists($cache_file)) {
        return unlink($cache_file);
    }
    return true; // Already gone or never existed
}

/**
 * Clears the entire cache directory.
 * @return bool True on success, false on failure.
 */
function clear_all_cache(): bool {
    $cache_dir = __DIR__ . '/../cache/';
    if (!is_dir($cache_dir)) {
        return true; // Nothing to clear
    }
    $files = glob($cache_dir . '*'); // get all file names
    foreach($files as $file){ // iterate files
      if(is_file($file)) {
        unlink($file); // delete file
      }
    }
    return true;
}
