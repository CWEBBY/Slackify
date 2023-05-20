export function pad(number, size = 2) {
    var s = String(number);
    while (s.length < size) {s = "0" + s;}
    return s;
}

export function autosize() {
    var el = this;  
    setTimeout(function() {
        el.style.cssText = 'height:auto; padding:0';
        el.style.cssText = 'height:' + el.scrollHeight + 'px; padding:0; resize: none; width: 100%;';
    },
    0
);}