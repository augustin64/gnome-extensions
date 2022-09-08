'use strict';

const { GObject, St, Clutter, GLib, Gio, GnomeDesktop, Shell, NM } = imports.gi;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const Main = imports.ui.main;
const Mainloop = imports.mainloop;
const Util = imports.misc.util;
const AppFavorites = imports.ui.appFavorites;
const SystemActions = imports.misc.systemActions;
const { Media, Player } = Me.imports.mediaPlayer;
const SystemLevels = Me.imports.systemLevels;
const { NMWirelessDialog } = Me.imports.networkDialog;
const shellVersion = Math.floor(parseFloat(imports.misc.config.PACKAGE_VERSION));

// USERBOX
var UserBox = GObject.registerClass(
class UserBox extends St.Bin{
    _init(vertical, iconSize){
        super._init({
            x_expand: true,
            y_expand: true,
            reactive: true,
            style_class: 'events-button db-user-box',
        });
        this.userIcon = new St.Bin({
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
            x_expand: true,
            y_expand: true,
            style_class: 'db-user-icon',
            style: 'background-image: url("/var/lib/AccountsService/icons/'+ GLib.get_user_name() +'"); background-size: cover;',
        });
        if(iconSize){
            this.userIcon.width = iconSize;
            this.userIcon.height = iconSize;
        }else{
            this.userIcon.width = 120;
            this.userIcon.height = 120;
        }
        this.userName = new St.Label({
            text: GLib.get_user_name(),
            x_expand: true,
            y_expand: true,
        });
        this.greet = new St.Label({
            text: this._getGreet(),
            x_expand: true,
            y_expand: true,
        });
        this.userText = new St.BoxLayout({
            vertical: true,
            x_expand: true,
            y_expand: true,
        });
        this.userText.add_child(this.userName);
        this.userText.add_child(this.greet);

        this._buildUI(vertical);
    }
    _getGreet(){
        let time = new Date();
        let hour = time.getHours();
        let greet = "Good Evening!";
        if(hour > 6){ greet = "Good Morning!"; }
        if(hour > 12){greet = "Good Afternoon!";}
        if(hour > 18){greet = "Good Evening!";}
        return greet;
    }
    _buildUI(vertical){
        let box = new St.BoxLayout({
            vertical: vertical,
            style_class: 'db-container'
        });
        box.add_child(this.userIcon);
        box.add_child(this.userText);
        this.set_child(box);
        if(vertical){
            this.greet.x_align = Clutter.ActorAlign.CENTER;
            this.userName.x_align = Clutter.ActorAlign.CENTER;
            this.userText.x_align = Clutter.ActorAlign.CENTER;
        }else{
            this.userText.y_align = Clutter.ActorAlign.CENTER;
        }
    }
});

//SYSTEM LEVELS
var LevelsBox = GObject.registerClass(
class LevelsBox extends St.BoxLayout{
    _init(vertical){
        super._init({
            x_expand: true,
            y_expand: true,
            style_class: 'events-button db-levels-box db-container',
            vertical: true,
            reactive: true,
        });

        this.levels = [
            new SystemLevels.PowerLevel(vertical),
            new SystemLevels.DirLevel(vertical),
            new SystemLevels.CpuLevel(vertical),
            new SystemLevels.RamLevel(vertical),
            new SystemLevels.TempLevel(vertical),
        ];

        this._buildUI(vertical);

        let levels = this;
        function update(){
            levels.updateLevels();
            return true;
        }
        this.timeout = Mainloop.timeout_add_seconds(1.0, update);
        this.connect('destroy', () => Mainloop.source_remove(this.timeout));
    }
    updateLevels(){
        this.levels.forEach(l => {
            l.updateLevel();
        });
        return true;
    }
    _buildUI(vertical){
        if(vertical){
            this.vertical = false;
        }
        this.levels.forEach(s => {
            this.add_child(s);
        });
    }
});

//MEDIA
var MediaBox = GObject.registerClass(
class MediaBox extends St.Bin{
    _init(vertical, coverSize){
        super._init({
            x_expand: true,
            y_expand: true,
            style_class: 'events-button db-media-box',
            reactive: true,
            child: new Media(vertical, coverSize)
        });
    }
});

//LINKS
const LinkButton = GObject.registerClass(
class LinkButton extends St.Button{
    _init(name, link){
        super._init({
            child: new St.Icon({
                gicon: Gio.icon_new_for_string(
                    Me.dir.get_path() + '/media/'+name+'-symbolic.svg'
                ),
                style_class: 'db-link-icon',
            }),
            style_class: 'events-button db-link-btn',
            x_expand: true,
        });
        this.connect('clicked', () => Util.spawnCommandLine('xdg-open '+link));
        this.add_style_class_name('db-'+name+'-btn');
    }
});

var LinksBox = GObject.registerClass(
class LinksBox extends St.BoxLayout{
    _init(vertical, settings){
        super._init({
            style_class: 'db-container',
            x_expand: true,
            y_expand: true,
            reactive: true,
        });
        if(vertical) this.vertical = true;
        let names = settings.get_strv('link-names');
        let urls = settings.get_strv('link-urls');

        this.links = [];

        for (let i = 0; i < urls.length; i++) {
            if(names[i] !== undefined){
                this.links.push(new LinkButton(names[i], urls[i]));
            }else{
                this.links.push(new LinkButton('none', urls[i]));
            }
        }

        this.links.forEach(ch => this.add_child(ch) );
    }
});

//CLOCK
var ClockBox = GObject.registerClass(
class ClockBox extends St.BoxLayout{
    _init(vertical){
        super._init({
            style_class: 'events-button db-clock-box',
            x_expand: true,
            reactive: true,
        });
        this.clock = new St.Label({
            style_class: 'db-clock',
            y_align: Clutter.ActorAlign.CENTER,
            x_align: Clutter.ActorAlign.CENTER,
            x_expand: true,
            y_expand: true
        });
        this.date = new St.Label({
            style_class: 'db-date',
            y_align: Clutter.ActorAlign.CENTER,
            x_align: Clutter.ActorAlign.CENTER,
            x_expand: true,
            y_expand: true
        });
        this.day = new St.Label({
            style_class: 'db-day',
            y_align: Clutter.ActorAlign.CENTER,
            x_align: Clutter.ActorAlign.CENTER,
            x_expand: true,
            y_expand: true
        });

        let vbox = new St.BoxLayout({
            vertical: true,
            y_align: Clutter.ActorAlign.CENTER,
            x_align: Clutter.ActorAlign.CENTER,
            x_expand: true,
        });
        vbox.add_child(this.day);
        vbox.add_child(this.date);
        this.add_child(this.clock);
        this.add_child(vbox);
        if(vertical) this.vertical = true;
        if(vertical) vbox.style = 'text-align: center';

        this.wallclock = new GnomeDesktop.WallClock();
        this.wallclock.connect(
            'notify::clock',
            () => this.updateClock() );
    
        this.updateClock();
    }
    updateClock(){
        //b - short month; m - month num; d- day num; A - day name;
        this.clock.text = GLib.DateTime.new_now_local().format('%H:%M ');
        this.date.text = GLib.DateTime.new_now_local().format('%Y. %m. %d.');
        this.day.text = GLib.DateTime.new_now_local().format('%A');
    }
});

const AppBtn = GObject.registerClass(
class AppBtn extends St.Button{
    _init(app){
        super._init({
            style_class: 'message-media-control db-app-btn',
            x_expand: true,
            child: new St.Icon({
                gicon: app.get_icon(),
                style_class: 'db-app-icon',
            }),
        });
        this.connect('clicked', () => app.activate());
    }
});

var AppBox = GObject.registerClass(
class AppBox extends St.BoxLayout{
    _init(cols, rows){
        super._init({
            vertical: true,
            style_class: 'events-button db-container db-app-box',
            y_expand: true,
            x_expand: true,
            reactive: true,
        });
        this.hboxes = [];
        this.cols = cols;
        this.rows = rows;
    }
    load(){
        this._buildUI();
    }
    _buildUI(){
        let favs = AppFavorites.getAppFavorites().getFavorites();
        for (let i = 0; i < this.rows; i++) {
            let box = new St.BoxLayout({
                style_class: 'db-container',
                y_expand: true,
                x_expand: true,
                y_align: Clutter.ActorAlign.CENTER,
                x_align: Clutter.ActorAlign.CENTER,
            });
            this.hboxes.push(box);
            this.add_child(box);
        }
        let k = 0;
        for (let i = 0; i < favs.length; i++) {
            if(i !== 0 && i%this.cols === 0) k++;
            if(this.hboxes[k]){
                this.hboxes[k].add_child(new AppBtn(favs[i]));
            }else{
                return;
            }
        }
    }
});

const SysBtn = GObject.registerClass(
class SysBtn extends St.Button{
    _init(icon, callback, iconSize){
        super._init({
            style_class: 'message-media-control db-sys-btn',
            child: new St.Icon({
                icon_name: icon,
                style_class: 'db-sys-icon',
                icon_size: iconSize
            }),
            y_expand: true,
        });
        this.connect('clicked', callback);
    }
});

var SysBox = GObject.registerClass(
class SysBox extends St.BoxLayout{
    _init(vertical, iconSize){
        super._init({
            style_class: 'db-container events-button',
        });
        if(vertical) this.vertical = true;
        if(iconSize) this.iconSize = iconSize;
        else this.iconSize = 22;
        this._buildUI();
        this.connect('destroy', () => {
            if(this.wifi !== null){
                this._client.disconnectObject(this);
                this._device.disconnectObject(this);
            }
        });
    }
    _buildUI(){
        this.wifi = new SysBtn('network-wireless-connected-symbolic', () => this._showNetworkDialog(), this.iconSize);
        let settings = new SysBtn('org.gnome.Settings-symbolic', () => Shell.AppSystem.get_default().lookup_app('org.gnome.Settings.desktop').activate(), this.iconSize);
        let bluetooth = new SysBtn('bluetooth-active-symbolic', () => Shell.AppSystem.get_default().lookup_app('gnome-bluetooth-panel.desktop').activate(), this.iconSize);

        if(this.vertical){
            this.add_child(settings);
            this.add_child(bluetooth);
            this.add_child(this.wifi);
        }else{
            this.add_child(this.wifi);
            this.add_child(bluetooth);
            this.add_child(settings);
        }
    }
    getNetworkWrapper(){
        let network;
        if(shellVersion == 42)
            network = Main.panel.statusArea.aggregateMenu._network;
        if(shellVersion == 43)
            network = Main.panel.statusArea.quickSettings._network;
        if(network !== null){
            let devices = network._client.get_devices();
            let wifiDevice;
            devices.forEach(element => {
                if(element.device_type === NM.DeviceType.WIFI)
                    wifiDevice = element;
            });
    
            this._client = network._client;
            this._device = wifiDevice;
    
            this._client.connectObject(
                'notify::wireless-enabled', this._syncWifiIcon.bind(this),
                'notify::wireless-hardware-enabled', this._syncWifiIcon.bind(this),
                'notify::connectivity', this._syncWifiIcon.bind(this), this);
    
            this._device.connectObject(
                'state-changed', this._syncWifiIcon.bind(this), this);
    
            this._syncWifiIcon();
        }else{
            this.wifi.destroy();
            this.wifi = null;
        }
    }
    _syncWifiIcon(){
        this.wifi.get_child().icon_name = this._getMenuIcon();
    }
    _getMenuIcon() {
        if (!this._client.wireless_enabled)
            return 'network-wireless-disabled-symbolic';

        if (this._device.active_connection)
            return this.getIndicatorIcon();
        else
            return 'network-wireless-signal-none-symbolic';
    }
    _canReachInternet() {
        if (this._client.primary_connection != this._device.active_connection)
            return true;

        return this._client.connectivity == NM.ConnectivityState.FULL;
    }
    getIndicatorIcon() {
        if (this._device.state < NM.DeviceState.PREPARE)
            return 'network-wireless-disconnected-symbolic';
        if (this._device.state < NM.DeviceState.ACTIVATED)
            return 'network-wireless-acquiring-symbolic';

        if (this._isHotSpotMaster())
            return 'network-wireless-hotspot-symbolic';

        let ap = this._device.active_access_point;
        if (!ap) {
            if (this._device.mode != NM['80211Mode'].ADHOC)
                log('An active wireless connection, in infrastructure mode, involves no access point?');

            if (this._canReachInternet())
                return 'network-wireless-connected-symbolic';
            else
                return 'network-wireless-no-route-symbolic';
        }

        let strength = 'excellent';
        if (ap.strength < 20)
            strength = 'none';
        else if (ap.strength < 40)
            strength = 'weak';
        else if (ap.strength < 50)
            strength = 'ok';
        else if (ap.strength < 80)
            strength = 'good';

        if (this._canReachInternet())
            return `network-wireless-signal-${strength}-symbolic`;
        else
            return 'network-wireless-no-route-symbolic';
    }
    _isHotSpotMaster() {
        if (!this._device.active_connection)
            return false;

        let connection = this._device.active_connection.connection;
        if (!connection)
            return false;

        let ip4config = connection.get_setting_ip4_config();
        if (!ip4config)
            return false;

        return ip4config.get_method() == NM.SETTING_IP4_CONFIG_METHOD_SHARED;
    }
    _showNetworkDialog(){
        this.dialog = new NMWirelessDialog(this._client, this._device);
        this.dialog.connect('closed', () => this.dialog = null);
        this.dialog.open();
    }
});

var SysActionsBox = GObject.registerClass(
class SysActionsBox extends St.BoxLayout{
    _init(layout, iconSize){
        super._init({
            style_class: 'db-container events-button',
        });
        this.layout = layout;
        if(iconSize) this.iconSize = iconSize;

        let sysActions = SystemActions.getDefault();
        this.powerOff = new SysBtn('system-shutdown-symbolic', () => sysActions.activateAction('power-off'), this.iconSize);
        this.restart = new SysBtn('system-reboot-symbolic', () => sysActions.activateAction('restart'), this.iconSize);
        this.logout = new SysBtn('system-log-out-symbolic', () => sysActions.activateAction('logout'), this.iconSize);
        this.suspend = new SysBtn('weather-clear-night-symbolic', () => sysActions.activateAction('suspend'), this.iconSize);

        this._buildUI();
    }
    _buildUI(){
        switch (this.layout) {
            case 0:
                this.rowLayout(); break;
            case 1:
                this.colLayout(); break;
            case 2:
                this.boxLayout(); break;
            default:
                this.boxLayout(); break;
        }
    }
    rowLayout(){
        this.add_child(this.suspend);
        this.add_child(this.logout);
        this.add_child(this.restart);
        this.add_child(this.powerOff);
    }
    colLayout(){
        this.vertical = true;
        this.add_child(this.powerOff);
        this.add_child(this.restart);
        this.add_child(this.logout);
        this.add_child(this.suspend);
    }
    boxLayout(){
        this.vertical = true;
        let row1 = new St.BoxLayout({
            style_class: 'db-container',
            x_expand: true,
            y_expand: true
        });
        let row2 = new St.BoxLayout({
            style_class: 'db-container',
            x_expand: true,
            y_expand: true
        });
        row1.add_child(this.logout);
        row1.add_child(this.powerOff);
        row2.add_child(this.suspend);
        row2.add_child(this.restart);
        this.add_child(row1);
        this.add_child(row2);
    }
});