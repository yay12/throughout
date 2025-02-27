#!@GJS@ -m

import Gtk from "gi://Gtk";
import Gdk from "gi://Gdk";
//let { Gtk, Gdk } = imports.gi;

Gtk.init();
let monitors = Gdk.Display.get_default().get_monitors();
let details = [];
for (let m of monitors) {
    let { x, y, width, height } = m.get_geometry();
    details.push({ name: m.get_description(), x, y, width, height });
}

print(JSON.stringify(details));