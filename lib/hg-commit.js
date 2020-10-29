var path = require('path');
var _ = require('underscore-plus');
var exec = require('child_process').exec;
var HgCommitView = require('./hg-commit-view');
var CompositeDisposable = require('atom').CompositeDisposable;

var HgCommit = {
    hgCommitView: null,
    modalPanel: null,
    subscriptions: null,
    data: null,
    processing: false,

    activate: function(state) {
        this.hgCommitView = new HgCommitView(state.hgCommitViewState);
        this.hgCommitView.hgc = this;
        this.modalPanel = atom.workspace.addModalPanel({
            item: this.hgCommitView.getElement(),
            visible: false
        });
        this.subscriptions = new CompositeDisposable();
        return this.subscriptions.add(atom.commands.add('atom-workspace', {
            'hg-commit:commit': (function(_this) {
                return function() {
                    return _this.commit();
                };
            })(this)
        }));
    },

    deactivate: function() {
        this.modalPanel.destroy();
        this.subscriptions.dispose();
        return this.hgCommitView.destroy();
    },

    serialize: function() {
        return {
            hgCommitViewState: this.hgCommitView.serialize()
        };
    },

    commit: function() {
        var hgc = this;
        if (hgc.processing) return console.log('processing...');

        console.log('HgCommit commit!');
        if (this.modalPanel.isVisible()) {
            return this.modalPanel.hide();
        } else {
            hgc.hgCommitView.setLoading();
            hgc.modalPanel.show();

            this.hgStatus(function(err, data) {
                if (err) {
                    hgc.modalPanel.hide();
                    atom.confirm( { message: 'Error', detailedMessage: err || 'There was an error.'});
                }
            });
        }
    },

    hgStatus: function(cb) {
        var hgc = this;
        var hgPath = atom.config.get('hg-commit.hgPath');
        var stopAdd = atom.config.get('hg-commit.stopAutoAdd');
        var dir = atom.project.getPaths()[0];
        if (!dir) return cb('Hg-Commit only works in projects with a mercurial repository.');

        exec('cd ' + dir + ' && ' + hgPath + ' status', function(error, stdout, stderr) {
    		if ((stderr || error) && !stdout) {
                if (stderr.match(/skipping unreadable/)) return cb('This is a harmless but annoying windows bug when you have nothing to commit. Remove the ignore= line from your mercurial.ini file. Usually in C:\\Users\\Name\\');
                if (stderr.match(/abort: no repository found/)) return cb('No respository for this project.');
                if (stderr.match(/No such file or directory/)) {
                    console.log('- error:', stderr, stdout);
                    return cb('Hg executable not found. Make sure it is installed and the correct path is set in the settings.');
                }

    			console.log('error', stderr);
    			cb(error.toString());
    			return;
    		}

            console.log('output:', stdout);
            var output = '';
            var data = {};
            var lines = stdout.split("\n");
            _.each(lines, function(line, num) {
                var status = line.charAt(0);
                var file = line.substr(2);
                if (status && file) data[num] = {file: file, status: status};
                if (status && file) output += '<div class="line"><input name="line-' + num + '" type="checkbox" ' + (status == '?' && stopAdd ? '' : 'checked="checked"') + '/> <span class="status">' + status + '</span> ' + file + '</div>';
            });

            if (!output) { //no changes
                hgc.hgCommitView.setResults(false, 'No changes found.');
                setTimeout(function() {
                    hgc.modalPanel.hide();
                }, 2000);
                return;
            }

            hgc.data = data;
            hgc.hgCommitView.setData( output );
            hgc.hgCommitView.setFocus();
            cb(null, stdout);
        });
    },

    hgCommit: function() {
        var hgc = this;
        var hgPath = atom.config.get('hg-commit.hgPath');
        var stopAutoPush = atom.config.get('hg-commit.stopAutoPush');
        var dir = atom.project.getPaths()[0];
        var checks = hgc.hgCommitView.getChecks();
        var message = hgc.hgCommitView.getMessage();

        var hasFiles = false;
        var needsAR = false;
        var ignored = [];
        _.each(hgc.data, function(file, i) {
            //console.log('-', i, file.status, file.file, checks[i]);
            if ((file.status == '?' || file.status == '!') && checks[i]) {
                needsAR = true;
            }
            if (!checks[i]) ignored.push( '-X "' + file.file + '"' );
            if (checks[i]) hasFiles = true;
        });

        if (!hasFiles) {
            hgc.hgCommitView.setResults(false, 'No files to commit.');
            setTimeout(function() {
                hgc.modalPanel.hide();
            }, 1500);
            return;
        }

        hgc.hgCommitView.setLoading();

        var commit = function() {
            var cmdline = 'cd ' + dir;
            cmdline = cmdline + ' && ';
            cmdline = cmdline + hgPath + ' commit -m "' + message.replace('"', '&quot;') + '" ' + ignored.join(' ');
            if ( ! stopAutoPush ) {
               cmdline = cmdline + ' && ';
               cmdline = cmdline + hgPath + ' push -q';
            }
            exec(cmdline, function(error, stdout, stderr) {
                if (stderr || error) {
                    if (stderr.match(/abort: no repository found/)) error = 'No respository for this project.';
                    if (stderr.match(/No such file or directory/)) error = 'Hg executable not found. Make sure it is installed and the correct path is set in the settings.';
                    if (stderr.match(/No username/)) error = 'No username found, put on into your ~/.hgrc or repo/.hg/hgrc file.';
                    if (!error) error = stderr;

                    console.log('error', error, stderr);
                    hgc.hgCommitView.setResults(false, error);
                    setTimeout(function() {
                        hgc.modalPanel.hide();
                    }, 1500);
                    return;
                }

                // did the actual commit
                console.log('- finished commit!', stdout);
                hgc.hgCommitView.setResults(true, 'Commited!');
                setTimeout(function() {
                    hgc.modalPanel.hide();
                }, 1500);

            });
        };

        // if there are any active adds or removes, let's addremove
        if (needsAR) {
            console.log('- exec:', 'cd ' + dir + ' && ' + hgPath + ' addremove ' + ignored.join(' '));
            exec('cd ' + dir + ' && ' + hgPath + ' addremove ' + ignored.join(' '), function(error, stdout, stderr) {
        		if (stderr || error) {
                    if (stderr.match(/abort: no repository found/)) return hgc.hgCommitView.setResults(false, 'No respository for this project.');
                    if (stderr.match(/No such file or directory/)) return hgc.hgCommitView.setResults(false, 'Hg executable not found. Make sure it is installed and the correct path is set in the settings.');

        			console.log('error', stderr);
        			hgc.hgCommitView.setResults(false, error.toString());
        			return;
        		}

                // do the actual commit
                console.log('- addremove:', stdout);
                commit();
            });
        } else {
            commit();
        }


    },

    config: {
        hgPath: {
            title: 'Hg Path',
            description: 'Path to the Mercurial Executable',
            type: 'string',
            default: '/usr/local/bin/hg'
        },
        stopAutoAdd: {
            title: 'Stop Auto Add',
            description: 'Check this to not automatically check new files.',
            type: 'boolean',
            default: false
        },
        stopAutoPush: {
            title: 'Stop Auto Push',
            description: 'Check this to not automatically push commits upstream.',
            type: 'boolean',
            default: false
        }

    }

    /*
    config:
            # Random color configuration: On Color Picker open, show a random color
            randomColor:
                title: 'Serve a random color on open'
                description: 'If the Color Picker doesn\'t get an input color, it serves a completely random color.'
                type: 'boolean'
                default: true
    */
};

module.exports = HgCommit;
