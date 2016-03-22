# dell_raid_cc
Consistency Check Task Automation Tool for Dell Servers with iDRAC

Supports multiple virtual drives created on a single RAID controller

Does NOT support multi-controller configurations

This is the only way to automate consistency checks for ESXi 5.5+ servers running on Dell hardware with old Perc5 RAID controllers, since they don't have omconfig/omreport tools_

The correct way for Perc6+ controllers is to use megacli tool, which works with all LSI RAID controllers. Instructions for installing it on:
- ESXi: http://de.community.dell.com/techcenter/support-services/w/wiki/909.how-to-install-megacli-on-esxi-5-x/
- RedHat/CentOS: https://www.dell.com/support/article/us/en/19/SLN292236
Scheduling CC using megacli: https://ervikrant06.wordpress.com/2014/08/22/how-to-schedule-consistency-check-in-megaraid/

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
