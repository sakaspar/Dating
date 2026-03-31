/**
 * Storage shim for Expo Go compatibility.
 * In production builds, this would use @react-native-async-storage/async-storage.
 * For Expo Go, we use in-memory storage so the app can boot and UI can be tested.
 */

const memoryStore = {};

const AsyncStorageShim = {
  async getItem(key) {
    return memoryStore[key] ?? null;
  },
  async setItem(key, value) {
    memoryStore[key] = value;
  },
  async removeItem(key) {
    delete memoryStore[key];
  },
  async multiRemove(keys) {
    keys.forEach(k => delete memoryStore[k]);
  },
  async clear() {
    Object.keys(memoryStore).forEach(k => delete memoryStore[k]);
  },
  async getAllKeys() {
    return Object.keys(memoryStore);
  },
};

export default AsyncStorageShim;
