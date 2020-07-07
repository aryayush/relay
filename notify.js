// Send a push notification
function sendNotification(description, title) {
  // Get users’ settings from the cloud
  var libRequest = http();
  libRequest.headers({ 'Content-Type': 'application/json' });
  var libResult = libRequest.get(
    'https://api.mementodatabase.com/v1/libraries/' +
      '8peYBLKpn' +
      '/entries' +
      '?token=MT2t6Ng07H0QnU2YCsaP5BvsX8DL9l'
  );

  // If entries are found…
  var foundEntries,
    ids = [];
  if (libResult.code == 200) {
    foundEntries = JSON.parse(libResult.body).entries;
    for (var i in foundEntries) {
      // … skip the deleted ones…
      if (foundEntries[i].status == 'deleted') continue;

      // … and save the IDs of the active ones
      ids.push(foundEntries[i].id);
    }

    // Download active entries from the cloud one by one
    var entryRequest = http();
    entryRequest.headers({ 'Content-Type': 'application/json' });
    var currentUser,
      devices = [],
      entryResult,
      fields;
    for (var i in ids) {
      entryResult = entryRequest.get(
        'https://api.mementodatabase.com/v1/libraries/' +
          '8peYBLKpn' +
          '/entries/' +
          ids[i] +
          '?token=MT2t6Ng07H0QnU2YCsaP5BvsX8DL9l'
      );

      if (entryResult.code == 200) {
        fields = JSON.parse(entryResult.body).fields;

        // Skip settings that don’t pertain to notifications
        if (fields[0].value != 'Notifications') continue;

        // Skip user if they have notifications disabled
        if (fields[1].value == 'OFF') continue;

        // Skip the person making the change
        currentUser = fields[2].value;
        if (currentUser == user) continue;

        // Skip them if they don’t have access to current library
        var accessDenied = fields[3].value.join(', ');
        if (accessDenied.includes(library)) continue;

        for (var i = 5; i < fields.length; i++) {
          // Find the library that we are dealing with
          if (fields[i].name == library + '_Action') {
            // Skip current user if they don’t want this library’s updates
            if (fields[i + 1].value == true) break;

            // Skip current user if they don’t want this action’s updates
            if (fields[i].value.indexOf(action) == -1) break;

            // Skip current user if they want only updates they follow, and they don’t this one
            if (fields[i - 2].value == 'If I am following them,')
              if (entry.field('Followed By').indexOf(currentUser) == -1) break;

            // Save the user’s device if they’ve cleared all hurdles above
            devices.push(currentUser + '_Phone');
          }
        }
      }
    }
  }

  // If one or more devices are found…
  if (devices.length > 0) {
    // … set up the push notification
    var notification = {
      token: 'a4s21w8zvjh5zzj9itpyepk3v13gpo',
      user: 'uxdi2cg62oxhmq82ejdti5ogdnf84u',
      message: description,
      title: title,
      device: devices.join(','),
    };

    // Send it! :D
    var testVar = http();
    testVar.headers({ 'Content-Type': 'application/x-www-form-urlencoded' });
    var result = testVar.post(
      'https://api.pushover.net/1/messages.json',
      JSON.stringify(notification)
    );
  }
}
