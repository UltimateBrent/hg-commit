# Hg-Commit for Atom.io

The Hg-Commit package for the Atom.io editor is a simple utility to replace switching to a full mercurial client for incremental commits. If you work on webpages and commit to see changes, this can greatly improve your workflow. This is *not* a mercurial client replacement. You'll still need one to manage different repos, pull, merge etc.

`hg addremove` is automatically called before the commit to account for new files. If you don't want something added or committed, then simply uncheck it. This package also assumes you don't have to enter in a password to push your repo, so set up password-less access to your server somehow before using this.

![Preview Image](https://github.com/UltimateBrent/hg-commit/blob/master/preview.png?raw=true)

# Settings
If your hg executable isn't in `/usr/local/bin/hg` then you can input your new location.

The auto-add option by default automatically checks `?` untracked files and adds them when you commit.
