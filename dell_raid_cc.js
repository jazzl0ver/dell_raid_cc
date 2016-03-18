/*!
 *
 *  Consistency Check task automation tool for Dell servers with iDRAC
 *
 *  Supports multiple virtual drives created on a single RAID controller
 *  Does NOT support multi-controller configurations
 *  This is the only way to automate consistency checks for ESXi 5.5+ servers running on Dell hardware, since they don't have omconfig/omreport tools
 *
 *  Requirements:
 *  - Dell server with iDRAC ;-)
 *  - A server with Dell OpenManage Server Administrator (OMSA) installed and running (http://www.dell.com/support/contents/us/en/19/article/Product-Support/Self-support-Knowledgebase/enterprise-resource-center/Enterprise-Tools/OMSA/)
 *  - A server with CasperJS installed (http://casperjs.org)
 *
 *
 *  Usage (this example is for linux server):
 *
 *  1. Create a text file with credentials (creds.txt):
 *  export OMSAHOST=192.168.1.191
 *  export OMSAPORT=1311
 *  export USERNAME=root
 *  export PASSWORD=password
 *  export DELLHOST=192.168.1.30
 *
 *  2. Load it:
 *  $ source creds.txt
 *
 *  3. Run the script:
 *  $ casperjs --ignore-ssl-errors=true --cookies-file=/tmp/dell_raid_cc_cookie.jar dell_raid_cc.js
 *
 *  4. Set up a cronjob for periodical checks (Dell recommends RAID consistency checking once per month)
 *
 *
 *  Result:
 *
 *  1. If everything went well, you'll see something like:
 *  Found: Virtual Disk 0 [state: Ready; layout: RAID-10; size: 1,862.00GB]
 *    CC for Virtual Disk 0 has been started
 *  Found: Virtual Disk 1 [state: Ready; layout: RAID-1; size: 931.00GB]
 *    CC for Virtual Disk 1 has been started
 *
 *  2. If the CC task is already runnnig, you'll see something like:
 *  Found: Virtual Disk 0 [state: Resynching; layout: RAID-6; size: 5,026.50GB]
 *    CC for Virtual Disk 0 is still running, progress: 19% complete
 *
 *
 * Repository: https://github.com/jazzl0ver/dell_raid_cc
 *
 * Version: 1.0 (March 18, 2016)
 *
 * Copyright (c) 2016 jazzl0ver
 *
 * License: MIT
 *
*/

var casper = require("casper").create({
    verbose: true,
    logLevel: 'error',
//   logLevel: 'debug',
    pageSettings: {
        loadImages:  false,
        loadPlugins: false,
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.8; rv:23.0) Gecko/20130404 Firefox/23.0"
    }
});

var system = require('system');
var OMSAhost = system.env.OMSAHOST;
var OMSAport = system.env.OMSAPORT;
var username = system.env.USERNAME;
var password = system.env.PASSWORD;
var dellhost = system.env.DELLHOST;

var url = 'https://'+OMSAhost+':'+OMSAport+'/OMSALogin?manageDWS=false';

casper.options.viewportSize = { width: 950, height: 950 };

// print out all the messages in the headless browser context
casper.on('remote.message', function(msg) {
    this.echo('remote message caught: ' + msg);
});

// print out all the messages in the headless browser context
casper.on("page.error", function(msg, trace) {
    this.echo("Page Error: " + msg, "ERROR");
});
casper.on("error", function(msg, trace) {
    this.echo("Error: " + msg, "ERROR");
});

var terminate = function() {
    this.echo("Exiting..").exit();
};

// open OMSA url
casper.start(url);

casper.then(function() {
    casper.waitForSelector("frameset", function() {
        this.page.switchToFrame('managedws');
    });
});

// login into OMSA
casper.then(function() {
    this.waitForSelector("form input[name='user']", function() {
        this.fillSelectors('form', {
            'input[name = targetmachine ]' : dellhost,
            'input[name = user ]' : username,
            'input[name = password ]' : password,
            'input[name = ignorecertificate ]' : '1',
        });
        this.click('#login_submit');
    });
});

casper.then(function() {
    casper.waitForSelector("frameset", function() {
        this.page.switchToFrame('body');
    });
});

// find and click on Virtual Drives link
casper.then(function() {
    this.waitForSelector("frameset", function() {
        this.page.switchToFrame('ct');
    });
    this.waitForSelector("a#link_Storage", function() {
        this.click('a#link_Storage');
        this.waitForSelector("a#link_Controller\\.0", function() {
            this.click('a#link_Controller\\.0');
            this.waitForSelector("a#link_VD\\.0", function() {
                this.click('a#link_VD\\.0');
            });
        });
    });
});

casper.then(function() {
    this.page.switchToFrame('da');
    this.click('a#link_VD\\.0');

    this.page.switchToMainFrame();
    this.page.switchToFrame('body');
    this.page.switchToFrame('da');

    this.waitForSelector("select.data-area", function() {
        // iterate thru every virtual disk selection
        this.each(this.getElementsInfo('select.data-area'), function(self, VDtasks_sel) {
            // wait 2 seconds between CC task execution for each virtual drive, b/c we have to wait for the page reloaded
            this.wait(2000, function() {
                var VDtasks_arr = VDtasks_sel.attributes.name.split('.');
                VDtasks_arr.shift();

                var oid = VDtasks_arr.join('.');

                var VD_idx = VDtasks_arr.pop();
                VD_idx++;

                var VDname = this.getElementInfo('a#Name'+VD_idx);
                var VDstate = this.getElementInfo('td#State'+VD_idx).html;
                var VDlayout = this.getElementInfo('td#Layout'+VD_idx).html;
                var VDsize = this.getElementInfo('td#Size'+VD_idx).html;
                console.log('Found: '+VDname.text+' [state: '+VDstate+'; layout: '+VDlayout+'; size: '+VDsize+']');

                // run CC
                var result = this.evaluate(function(VDtaskSelID, VDname, oid, VD_idx) {
                    var select = document.getElementById(VDtaskSelID);
                    var options = select.options;
                    var result = '';
                    // find CC option in the select control
                    for (var j = 0; j < options.length; j++) {
                        if (options[j].text == 'Check Consistency') {
                            select.value = options[j].value;
                            onExecute(VDname, "."+oid, "true", "", "0");
                            result = 'CC for '+VDname+' has been started';
                            break;
                        }
                        else if (options[j].text == 'Cancel Check Consistency') {
                            select.value = options[j].value;
                            result = 'CC for '+VDname+' is still running, progress: '
                                +document.getElementById('table1_row_'+VD_idx+'.8').innerHTML;
                            break;
                        }
                    }
                    return result;
                }, VDtasks_sel.attributes.id, VDname.text, oid, VD_idx);

                if (result == '')
                    result = 'NO CC option found - this should not ever happen!';

                console.log('  '+result);
            });
        });
    });
});

// logout
casper.then(function() {
    this.page.switchToMainFrame();
    this.page.switchToFrame('gnv');
    this.evaluate(function() {
        logout();
    });
});

casper.run();
