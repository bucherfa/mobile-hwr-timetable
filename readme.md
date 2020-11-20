# Mobile HWR Timetable

## Features

- displays timetables from https://ipool.lehre.hwr-berlin.de/main.php?action=browse_stundenplaene (ICS/ICal)
- installable as an app on any device
- hides past events
- offline mode
- easily switch between timetables (limited to one at a time)

## Usage

open up the html page with the link to the ICS/ICal file as the `kurs` parameter.

```
https://bucherfa.github.io/mobile-hwr-timetable/?kurs=https://ipool.lehre.hwr-berlin.de/api/timetable/v1/data/informatik/semester1/kursa?filter=!Englisch,
// short version
https://bucherfa.github.io/mobile-hwr-timetable/?kurs=/informatik/semester1/kursa?filter=!Englisch,
```
