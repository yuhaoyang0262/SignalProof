'use strict';
// Preserve existing entry links and query parameters.
if (/^#(verify|cases|rules|tests|guide|transforms)(?:$|[/?])/.test(location.hash)) {
  location.replace('lab.html' + location.search + location.hash);
}
