function addActivity(action, entry, library) {
  // This code adds a notification about changes in this library to the Activity library
  // var entry = entry();

  // Define the action here and no change is needed to the rest of the program
  // Choices are 'added', 'deleted' and 'updated'
  // var action = 'updated';

  // Choose type over project title if it exists
  // var library = lib().title;
  var type;
  if (
    library == 'Feedback' ||
    library == 'Finances' ||
    library == 'Orders' ||
    library == 'Planner'
  )
    type = entry.field('Type');
  if (library == 'Catalogue') type = entry.field('Subcategory');

  // Convert plural to singular and vice versa
  var lastChar, plural, singular;
  if (type) {
    singular = type;
    plural = pluralize.plural(singular);
  } else {
    plural = library;
    singular = pluralize.singular(plural);
  }

  // Get the user’s first name and current date / time
  // var user = libByName('Employees').find(user())[0].field('First');
  var dateTime = new Date();

  // Get the project name if it exists
  var projectTitle = '',
    prjct;
  if (
    library == 'Expenses' ||
    library == 'Interactions' ||
    library == 'Invoices' ||
    library == 'Notes' ||
    library == 'Planner' ||
    library == 'Tasks'
  ) {
    if (entry.field('Project')[0]) {
      prjct = entry.field('Project')[0];
      projectTitle = prjct.title;
    }
  }

  // Find all entries in the Activity library for that action
  var activities = libByName('Activity');
  var activity;
  var entries = activities.find(
    action + ' ' + projectTitle + ' ' + (type ? type : library) + ' ' + user
  );

  // Find the first entry from the same user that matches all criteria
  for (var i in entries) {
    // Entry should be from the same day…
    if (
      moment(entries[i].field('Date')).format('MMM Do YYYY') !=
      moment(dateTime).format('MMM Do YYYY')
    )
      break;

    // … for the same type of entry…
    if (entries[i].field('UID') != 'uid_' + (type ? type : library)) continue;
    if (!entries[i].title.includes(action)) continue;

    // … by the same user…
    if (!entries[i].title.includes(user)) continue;

    // … and from the same project, if a project is linked
    if (entries[i].field('All Projects') != projectTitle) continue;

    activity = entries[i];
    break;
  }

  // Determine the correct article to use
  var char = singular.charAt(0).toLowerCase();
  var article =
    char == 'a' || char == 'e' || char == 'i' || char == 'o' || char == 'u'
      ? 'an'
      : 'a';

  // If the entry does not exist, prepare a new one
  if (!activity) {
    var newTitle = action + ' ' + article + ' ' + singular.toLowerCase();
    activities.create({
      'All Projects': projectTitle,
      'All Titles': entry.title,
      Hide: 4,
      Library: library,
      'Project Link': prjct,
      Title: newTitle,
      Type: type,
      UID: 'uid_' + (type ? type : library),
      User: user,
      'Read By': [user],
    });

    // Link the current entry and add ID to the activity
    var newEntry = activities.find('"uid_' + user + '" ' + newTitle)[0];
    newEntry.link(library, entry);
    newEntry.set('All IDs', entry.id);

    // Mark entry as read for users without access to its library
    updatePermissions(newEntry, library);

    // Set the date and time attribute for the link
    newEntry.field(library)[0].setAttr('Date and Time', dateTime);

    // Send a push notification
    sendNotification(newEntry.description, newEntry.title);
  } else {
    // If the entry exists, save the new entry to the start of an array
    // and the date and time, IDs and titles to separate arrays
    var entries = activity.field(library);
    var sortedAttrs = [],
      sortedEntries = [],
      sortedIDs = [],
      sortedTitles = [];
    sortedAttrs.push(dateTime);
    sortedEntries.push(entry);
    sortedIDs.push(entry.id);
    sortedTitles.push(entry.title);

    // Save all previous entries and their data to the four arrays,
    // excluding our new entry
    for (var i in entries) {
      if (entries[i].id == entry.id) continue;
      sortedAttrs.push(entries[i].attr('Date and Time'));
      sortedEntries.push(entries[i]);
      sortedIDs.push(entries[i].id);
      sortedTitles.push(entries[i].title);
    }

    // Set the entries and date and time using the two new arrays
    activity.set(library, sortedEntries);
    for (var i in sortedEntries) {
      activity.field(library)[i].setAttr('Date and Time', sortedAttrs[i]);
    }

    // Save all IDs and titles, including those of deleted entries
    var allIDs = activity.field('All IDs').split('@@');
    var allTitles = activity.field('All Titles').split('@@');
    for (var i in allIDs) {
      if (sortedIDs.indexOf(allIDs[i]) == -1) {
        sortedIDs.push(allIDs[i]);
        sortedTitles.push(allTitles[i]);
      }
    }
    activity.set('All IDs', sortedIDs.join('@@'));
    activity.set('All Titles', sortedTitles.join('@@'));

    // Update the entry title
    var newTitle =
      action + ' ' + sortedTitles.length + ' ' + plural.toLowerCase();
    activity.set('Title', newTitle);
    newTitle = user + ' ' + newTitle;
    message(newTitle);

    // Reset the time and read status
    activity.set('Date', dateTime);
    activity.set('Time', dateTime);
    activity.set('Read By', [user]);

    // Mark entry as read for users without access to its library
    updatePermissions(activity, library);

    // Send a push notification
    sendNotification(sortedTitles.join(' ,'), newTitle);
  }

  // Mark entry as read for users without access to its library
  function updatePermissions(activity, lib) {
    var employees = libByName('Employees').entries();
    var readBy = activity.field('Read By');
    for (var i in employees) {
      if (employees[i].field('Access Denied').indexOf(lib) > -1)
        readBy.push(employees[i].field('First'));
    }
    activity.set('Read By', readBy);
  }

  // Send a push notification
  function sendNotification(description, title) {
    // Set up the push notification
    var notification = {
      token: 'a4s21w8zvjh5zzj9itpyepk3v13gpo',
      user: 'uxdi2cg62oxhmq82ejdti5ogdnf84u',
      message: description,
      title: title,
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
