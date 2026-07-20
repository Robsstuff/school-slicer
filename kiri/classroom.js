// Speers Point classroom mode: locks the UI to the single Creality K2 Pro
// FDM workflow since no other printer or process mode is ever used here.
(function () {
    function hideLabelAndParent(text) {
        document.querySelectorAll('label').forEach(function (el) {
            if (el.textContent.trim().toLowerCase() === text) {
                var parent = el.parentElement;
                if (parent) parent.style.display = 'none';
            }
        });
    }

    function hideLabelOnly(text) {
        document.querySelectorAll('label').forEach(function (el) {
            if (el.textContent.trim().toLowerCase() === text) {
                el.style.display = 'none';
            }
        });
    }

    function applyClassroomMode() {
        // remove the print-mode switcher (CNC / SLA / Laser / Water / Wire / Drag)
        // FDM is the only mode this school uses
        hideLabelAndParent('mode');

        // remove ability to add/switch/manage printer profiles or CNC tool tables
        // the K2 Pro profile is preloaded and is the only printer this school owns
        hideLabelOnly('machines');
        hideLabelOnly('profiles');
        hideLabelOnly('tools');

        // PWA install/uninstall relies on the offline bundle we don't ship
        hideLabelOnly('install');
        hideLabelOnly('uninstall');

        // hide the machine + process profile picker block (id: all-devpro) --
        // K2 Pro and its tuned process settings are preloaded as the only option
        var devpro = document.getElementById('all-devpro');
        if (devpro) devpro.style.display = 'none';
    }

    // menubar renders asynchronously after kiri.js boots, so retry briefly
    var attempts = 0;
    var timer = setInterval(function () {
        attempts++;
        applyClassroomMode();
        if (attempts > 20) clearInterval(timer);
    }, 250);
})();
