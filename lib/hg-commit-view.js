var $j = require('jquery');
var _ = require('underscore-plus');



function HgCommitView() {
    var hgcv = this;
    this.hgc = null;

    this.serialize = function() {};
    this.destory = function() {
        return this.element.remove();
    };
    this.getElement = function() {
        return this.element;
    };

    this.element = $j('<div class="hg-commit"><div class="message"></div><div class="commit-message"><input class="native-key-bindings" type="text" placeholder="Commit Message"/></div><div class="results"><i></i><div class="text"></div></div></div>');
    this.element.on('keydown', function(e) {
        var ctrlDown = e.ctrlKey || e.metaKey;

        if (e.which == 27) { // esc
            hgcv.hgc.modalPanel.hide();
        }

        if (e.which == 13) { //enter
            hgcv.hgc.hgCommit();
        }

    });

    this.setLoading = function() {
        this.element.find('.message').show().html( '<span class="loading"><i class="icon icon-sync"></i> Loading...</span>');
        this.element.find('.commit-message').hide();
        this.element.find('.results').hide();
    };

    this.setData = function(output) {
        this.element.find('.message').html( output );
        this.element.find('.commit-message').show();
    };

    this.setResults = function(success, text) {
        this.element.find('.results i').removeClass('icon-flame icon-check').addClass(success ? 'icon-check' : 'icon-flame');
        this.element.find('.results .text').html( text );
        this.element.find('.results').show();
        this.element.find('.message').hide();
        this.element.find('.commit-message').hide();
    };

    this.getChecks = function() {
        var checks = {};
        this.element.find('.message input[type=checkbox]').each(function() {
            var i = $j(this).attr('name').split('-')[1];
            var val = $j(this).is(':checked');
            checks[i] = val;
        });

        return checks;
    };

    this.getMessage = function() {
        return this.element.find('.commit-message input').val();
    };

    this.setFocus = function() {
        this.element.find('.commit-message input').focus();
    };
};

module.exports = HgCommitView;
