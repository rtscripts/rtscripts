# `@rtscripts/rtorrent-command-rename-on-remove`

> Rename movie file to containing folder when it is removed from rtorrent

## Usage

Copy & Edit the following into `~/.rtorrent.rc`

```
method.set_key = event.download.erased, rename_on_remove, \
    "execute = ~/path/to/rename-removed.js, \
        --default-directory,(directory.default), \
        --session-path,(session.path), \
        --hash,(d.hash), \
        --hashing,(d.hashing), \
        --hashing-failed,(d.hashing_failed), \
        --name,(d.name), \
        --directory,(d.directory), \
        --base-path,(d.base_path), \
        --tied-to-file,(d.tied_to_file), \
        --is-multi-file,(d.is_multi_file), \
        --complete,(d.complete)"
```
