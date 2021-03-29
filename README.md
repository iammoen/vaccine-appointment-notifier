# vaccine-appointment-notifier
nodejs file that will pull data from vaccinespotter.org, do distance math, and then notify via pushover

I run this with foreverjs

```
forever start -a -l forever.log -o out.log -e err.log  process.js
```
