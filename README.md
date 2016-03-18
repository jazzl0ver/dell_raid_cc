# dell_raid_cc
Consistency Check task automation tool for Dell servers with iDRAC

Supports multiple virtual drives created on a single RAID controller

Does NOT support multi-controller configurations

Requirements:
- Dell server with iDRAC ;-)
- A server with Dell OpenManage Server Administrator (OMSA) installed and running (http://www.dell.com/support/contents/us/en/19/article/Product-Support/Self-support-Knowledgebase/enterprise-resource-center/Enterprise-Tools/OMSA/)
- A server with CasperJS installed (http://casperjs.org)

Usage (this example is for linux server):

* Create a text file with credentials (creds.txt):
```
export OMSAHOST=192.168.1.191
export OMSAPORT=1311
export USERNAME=root
export PASSWORD=password
export DELLHOST=192.168.1.30
```
* Load it:
```
$ source creds.txt
```
* Run the script:
```
$ casperjs --ignore-ssl-errors=true --cookies-file=/tmp/dell_raid_cc_cookie.jar dell_raid_cc.js
```
* Set up a cronjob for periodical checks (Dell recommends RAID consistency checking once per month)


Result:

If everything went well, you'll see something like:
```
Found: Virtual Disk 0 [state: Ready; layout: RAID-10; size: 1,862.00GB]
  CC for Virtual Disk 0 has been started
Found: Virtual Disk 1 [state: Ready; layout: RAID-1; size: 931.00GB]
  CC for Virtual Disk 1 has been started
```
If the CC task is already runnnig, you'll see something like:
```
Found: Virtual Disk 0 [state: Resynching; layout: RAID-6; size: 5,026.50GB]
  CC for Virtual Disk 0 is still running, progress: 19% complete
```
Copyright (c) 2016 jazzl0ver

License: MIT
