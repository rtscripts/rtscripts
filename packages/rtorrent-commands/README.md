# `@rtscripts/rtorrent-command-rename-on-remove`

> Rename movie file to containing folder when it is removed from rtorrent

## Usage

### Install

`npm install -g @rtscripts/rtorrent-commands`

#### Examples

##### rtorrent-rename-on-remove

```
$ rtorrent-rename-on-remove --version

Options:
  --help       Show help                                               [boolean]
  --version    Show version number                                     [boolean]
  --directory  folder containing torrent                     [string] [required]
  --basePath   path to torrent files                         [string] [required]
  --complete   has torrent completed                                    [number]
  --output     file to log into                                        [default:
          "$HOME/Library/Logs/rtorrent.command.rename-on-removed.log"]
```

Copy & Edit the following into `~/.rtorrent.rc`

```
method.set_key = event.download.erased, rename_on_remove, \
    "execute = rtorrent-rename-on-remove, \
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
