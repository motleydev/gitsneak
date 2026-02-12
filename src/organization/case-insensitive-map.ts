/**
 * Case-insensitive Map for organization deduplication
 *
 * Ensures 'Google', 'GOOGLE', 'google' all merge into one entry.
 * Stores the canonical (original) casing for display purposes.
 */

/**
 * A Map that treats keys as case-insensitive
 * Useful for deduplicating organization names with different capitalizations
 *
 * @example
 * const map = new CaseInsensitiveOrgMap<number>();
 * map.set('Google', 1);
 * map.set('GOOGLE', 2);  // Overwrites 'Google' entry
 * map.get('google')      // 2
 * map.getCanonicalKey('GOOGLE')  // 'GOOGLE' (last set key)
 */
export class CaseInsensitiveOrgMap<V> extends Map<string, V> {
  /**
   * Stores the canonical (original) casing for each normalized key
   */
  private canonicalKeys: Map<string, string> = new Map();

  /**
   * Normalize a key for storage/lookup
   */
  private normalizeKey(key: string): string {
    return key.toLowerCase().trim();
  }

  /**
   * Set a value with case-insensitive key
   * The last set key's casing becomes the canonical form
   */
  override set(key: string, value: V): this {
    const normalized = this.normalizeKey(key);
    this.canonicalKeys.set(normalized, key);
    return super.set(normalized, value);
  }

  /**
   * Get a value with case-insensitive key lookup
   */
  override get(key: string): V | undefined {
    return super.get(this.normalizeKey(key));
  }

  /**
   * Check if key exists (case-insensitive)
   */
  override has(key: string): boolean {
    return super.has(this.normalizeKey(key));
  }

  /**
   * Delete a value with case-insensitive key
   */
  override delete(key: string): boolean {
    const normalized = this.normalizeKey(key);
    this.canonicalKeys.delete(normalized);
    return super.delete(normalized);
  }

  /**
   * Clear all entries
   */
  override clear(): void {
    this.canonicalKeys.clear();
    super.clear();
  }

  /**
   * Get the canonical (original) casing of a stored key
   *
   * @param key - Key to look up (any casing)
   * @returns The stored canonical casing, or undefined if not found
   *
   * @example
   * map.set('Google', 1);
   * map.set('GOOGLE', 2);
   * map.getCanonicalKey('google')  // 'GOOGLE'
   */
  getCanonicalKey(key: string): string | undefined {
    return this.canonicalKeys.get(this.normalizeKey(key));
  }

  /**
   * Iterate over entries with canonical keys
   * Yields [canonicalKey, value] pairs
   */
  *entriesWithCanonicalKeys(): IterableIterator<[string, V]> {
    for (const [normalized, value] of super.entries()) {
      const canonical = this.canonicalKeys.get(normalized) ?? normalized;
      yield [canonical, value];
    }
  }
}
