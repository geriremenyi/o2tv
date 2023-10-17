var Channels = (function() {
  var init = function() {
    var chanelsWapper = document.getElementById('channels-list-wrapper')
    channels = JSON.parse(localStorage.getItem('channels'));
    channels.forEach(function(channel) {
      var channelDiv = document.createElement('div');
      channelDiv.setAttribute('id', 'channel-' + channel.id);
      chanelsWapper.appendChild(channelDiv);
      var channelPlayerAnchor = document.createElement('a');
      channelPlayerAnchor.setAttribute('href', 'player.html?channelId=' + channel.id)
      channelDiv.appendChild(channelPlayerAnchor);
      var channelImage = document.createElement('img');
      channelImage.setAttribute('src', channel.imageUrl);
      channelPlayerAnchor.appendChild(channelImage);
      var channelName = document.createElement('span');
      channelName.textContent = channel.name;
      channelPlayerAnchor.appendChild(channelName);
    });
  };

  return { init };
})();