/**
 * Services related to the device.
 */
var Device = (function() {
  /**
   * The local storage key storing the device ID
   */
  var UDID_STORAGE_KEY = 'udid';

  /**
   * Get the device id (udid) from local storage or create
   * a new device id and save it in the local storage.
   * 
   * @returns The device id
   */
  var getOrCreateID = function() {
    var udid = localStorage.getItem(UDID_STORAGE_KEY);
    if(!udid) {
      var random = Math.random().toString().substring(2, 16) + "_LG";
      var sha256 = forge_sha256(random);
      var substring = sha256.substring(0, 16);
      udid = substring.toUpperCase();
      localStorage.setItem(UDID_STORAGE_KEY, udid);
    }

    return udid;
  };

  return { getOrCreateID };
})();