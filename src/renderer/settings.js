const THEMES={graphite:{cardColor:'#111318',digitColor:'#f4f1e8',backgroundColor:'#05070a',accentColor:'#8fb7ff'},ivory:{cardColor:'#e8dfce',digitColor:'#1d1b18',backgroundColor:'#c7bdac',accentColor:'#f7b267'},midnight:{cardColor:'#07111f',digitColor:'#c9f2ff',backgroundColor:'#02050a',accentColor:'#5eead4'}};
const $=id=>document.getElementById(id);let settings;
function render(s){settings=s;$('use24Hour').checked=s.clock.use24Hour;$('showSeconds').checked=s.clock.showSeconds;$('showDate').checked=s.clock.showDate;$('preset').value=s.theme.preset;$('scale').value=s.layout.scale;$('tilt').value=s.camera.tilt;$('position').value=s.layout.position;}
async function save(patch){settings=await window.flipClock.setSettings(patch);render(settings)}
window.flipClock.getSettings().then(render);window.flipClock.onSettings(render);
['use24Hour','showSeconds','showDate'].forEach(id=>$(id).addEventListener('change',()=>save({clock:{...settings.clock,[id]:$(id).checked}})));
$('preset').addEventListener('change',()=>save({theme:{...settings.theme,...THEMES[$('preset').value],preset:$('preset').value}}));
$('scale').addEventListener('input',()=>save({layout:{...settings.layout,scale:Number($('scale').value)}}));
$('tilt').addEventListener('input',()=>save({camera:{...settings.camera,tilt:Number($('tilt').value)}}));
$('position').addEventListener('change',()=>save({layout:{...settings.layout,position:$('position').value}}));
$('restart').addEventListener('click',()=>window.flipClock.restartClock());
