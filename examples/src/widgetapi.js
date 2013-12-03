(function(){

// Hash of topic name to iframe element reference.
var topics = {};

function subscribe(topic, evt){
    if (!topics[topic]) topics[topic] = [];
    // Don't add duplicate subscriptions.
    if (topics[topic].indexOf(evt.source) >= 0) return;
    topics[topic].push(evt.source);
}

function unsubscribe(topic, evt){
    if (!topics[topic]) return;
    var index = topics[topic].indexOf(evt.source);
    if (index >= 0) topics[topic].splice(index, 1);
}

function broadcastTopic(source, topic, message){
    if (!topics[topic]) return;
    topics[topic].forEach(function(iframe){
        // Skip the source.
        if (iframe === source) return;
        iframe.postMessage({
            type: 'message',
            method: 'publish',
            payload: {
                topic: topic,
                message: message
            }
        }, '*');
    });
}

function resize(evt){
    var sourceObject = findIFrameWithWindow(evt.source);
    var payload = evt.data.payload;
    if (payload.width) sourceObject.style.width = payload.width + 'px';
    if (payload.height) sourceObject.style.height = payload.height + 'px';
}

function findIFrameWithWindow(win){
    var widgetsOnPage = document.querySelectorAll('iframe');
    for (var i = 0; i < widgetsOnPage.length; i++){
        if (win === widgetsOnPage[i].contentWindow) return widgetsOnPage[i];
    }
}

// Method returns a queryString from <param> tags inside and <object>.
function getQueryStringFromParams(objectNode){
    var params = objectNode.querySelectorAll('param');
    var queryString = [].reduce.call(params, function(acc, paramNode){
        var name = paramNode.getAttribute('name');
        var value = paramNode.getAttribute('value');

        if (acc) acc += '&';
        return acc + encodeURIComponent(name) + '=' + encodeURIComponent(value);
    }, '');
    return queryString;
}

window.addEventListener('message', function(evt){
    if (evt.data.type === 'message' && evt.data.method === 'subscribe'){
        subscribe(evt.data.payload.topic, evt);
    } else if (evt.data.type === 'message' && evt.data.method === 'unsubscribe'){
        unsubscribe(evt.data.payload.topic, evt);
    } else if (evt.data.type === 'message' && evt.data.method === 'publish'){
        broadcastTopic(evt.source, evt.data.payload.topic, evt.data.payload.message);
    } else if (evt.data.type === 'view' && evt.data.method === 'set'){
        resize(evt);
    }
});

window.addEventListener('DOMContentLoaded', function(){
    // Turn the <object> tags into <iframe> tags to work around webkit bug https://bugs.webkit.org/show_bug.cgi?id=75395.
    // Also append parameters to widget url so they're accessible to the widget implementation.
    // Nyo: To prevent the flicker when loading, you might want to do this transformation work server-side
    // before sending the HTML to the browser.
    var objectNodes = document.querySelectorAll('object');
    var numLoaded = 0;
    [].forEach.call(objectNodes, function(objectNode){
        var iframeNode = document.createElement('iframe');
        iframeNode.setAttribute('sandbox', 'allow-scripts');
        var queryString = getQueryStringFromParams(objectNode);
        var url = objectNode.getAttribute('data') + '?' + queryString;
        iframeNode.setAttribute('src', url);
        iframeNode.setAttribute('class', objectNode.getAttribute('class'));

        // Swap the <object> for the <iframe> node.
        objectNode.parentNode.replaceChild(iframeNode, objectNode);
    });
});


})();