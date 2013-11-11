# Overview

Inkling is an interactive ebook reading application on iOS and the [Web](www.inkling.com). Inkling content is created using [Inkling Habitat](habitat.inkling.com). Inkling supports embeddable widgets to make content interactive.

# Examples

The following are examples of widgets in Inkling content:

* [Weather forecast](https://www.inkling.com/read/frommers-japan-alt-1st/chapter-3/ch03-introduction)
* [Word search game](https://www.inkling.com/read/dummies-spanish-wald-kraynak-2nd/chapter-1/fun--games)
* [Javascript code console](https://www.inkling.com/read/javascript-definitive-guide-david-flanagan-6th/chapter-7/array-length)
* [HTML5 code console](https://www.inkling.com/read/dummies-html5-tutorials-frank-boumphrey-1st/lesson-5/ch05-section-5)

# Spec

## Representation in Content
Widgets are represented in content using &lt;object&gt; with optional &lt;param&gt; tags.

Example:

```
<object type="text/html" data="weather.html">
	<param name="zipCode" value="94123"></param>
</object>
```

When an &lt;object&gt; tag is rendered by the reading system its parameters are added to its URL as querystring parameters. Example after reading system transformation:

```
<object type=”text/html” data=”weather.html?zipCode=94123”></object>
```

## Package format

There currently isn't a packaging format or manifest file required for Inkling widgets. Though the proposal at https://github.com/IDPF/widgets/wiki/Submission-Request-to-IDPF:-EPUB-Widgets-1.0 seems reasonable.

All that is currently required is a single HTML file to point the &lt;object&gt; tag to. The reading system should leave all files in the widget directory untouched so relative paths work.


## Javascript APIs

These are APIs that a widget can use to communicate with the reading system. For ease of implementation it is modeled after the HTML5 postMessage API. The message protocol is:

```
{
	"type": ("view" | "message"),
	"method": (method name specific to the type),
	"payload": (object with key/values specific to the method)
}
```


### View API
Allows a widget to change its size in the content.

#### Method: set
Sets the widget’s size. Per the HTML5 spec, an &lt;object&gt; doesn’t expand to the dimensions of the content it contains. Instead, scrollbars will appear inside the element. This API allows a widget to request a new size.

Message format:

```
{
	"type": "view",
	"method": "set",
	"payload": {
		"width": <(Optional) (Number) number of pixels of width>,
		"height": <(Optional) (Number) number of pixels of height>
	}
}
```

Example code in a widget:

```
// Resize the widget to the height of its contents.
window.parent.postMessage({
	"type": "view",
	"method": "set",
	"payload": {
		"height": document.documentElement.scrollHeight
	}
}, ‘*’);
```

### Message API
A pub/sub message bus for widgets to communicate with each other on the same page. It’s useful when there are many widgets on a page that need to message each other in a partitioned way.


#### Method: subscribe
Subscribes a widget to a topic. The widget will receive messages from other widgets that broadcast to that topic on the same page.

Message format:

```
{
	"type": "message",
	"method": "subscribe",
	"payload": {
		"topic": <(Required) string topic name>
	}
}
```

Example code in a widget:

```
// Save content to the platform.
window.parent.postMessage({
	"type": "message",
	"method": "subscribe",
	"payload": {
		"topic": "mytopic"
	}
}, ‘*’);
```

#### Method: unsubscribe
Unsubscribes widgets from a topic.

Message format:

```
{
	"type": "message",
	"method": "unsubscribe",
	"payload": {
		topic: <(Required) string topic name>
	}
}
```

Example code in a widget:

```
// Save content to the platform.
window.parent.postMessage({
	"type": "message",
	"method": "unsubscribe",
	"payload": {
		"topic": "mytopic"
	}
}, ‘*’);
```

#### Method: publish
Publish a message on a topic. This message is sent to all widgets on the page that are subscribed to that topic.

Message format:

```
{
	"type": "message",
	"method": "publish",
	"payload": {
		"topic": <(Required) string topic name>,
		"message": <(Required) object that can be serialized into JSON>
	}
}
```

Example code in a widget:

```
// Save content to the platform.
window.parent.postMessage({
	"type": "message",
	"method": "publish",
	"payload": {
		"topic": "mytopic",
		"message": {
			"mykey": "myvalue"
		}
	}
}, ‘*’);
```

#### Receiving published events
This message is sent from the reading system to the widget when another widget publishes to a topic.

Message format:

```
{
	"type": "data",
	"method": "publish",
	"payload": {
		"topic": (String topic name),
		"message": (object that can be serialized via the postMessage API)
	}
}
```

Example code in a widget:

```
// Receive saved content from the platform.
window.addEventListener('message', function(evt){
	if (evt.data.type == "message" && evt.data.method == "publish"){
		// evt.data.payload.topic contains the topic name
		// evt.data.payload.message contains the saved content
	}
});
```

## Handling Input Events

___This is proposed but not yet implemented in Inkling___

If a widget is using an input event, it should call event.preventDefault() to prevent reading system default behavior. For example, if a reading system uses a swipe gesture for navigation that competes with a slider widget, the widget should call preventDefault() on the touchmove event to let the reading system know not to handle it.

## Widget Visibility API

___This is proposed but not yet implemented in Inkling___

A widget might want to know when it moves in and out of the viewport. This can be acheived using the HTML5 Page Visbility API. Example code inside a widget:

```
document.addEventListener("visibilityChange", function(){
	if (document.visibilityState !== "visible"){
		// Stop all media from playing.
	}
});
```

# Implementation Details

## Object vs Iframe

Inkling converts object tags into iframes when the published content is rendered in the reading system. This is because of browser bugs such as https://bugs.webkit.org/show_bug.cgi?id=75395. IFrames are functionally equivalent to object tags.

## Iframe sandbox attribute
Another benefit of rendering object tags as iframes is that iframes support the ‘sandbox’ attribute. Per the HTML5 spec, sandboxing prevents Javascript from accessing document.cookie, localStorage, and the parent window context. Javascript can be safely run when rendered inside a UIWebView on iOS or when served off the same domain on the Web.

## Supporting IE8
Chrome, Safari, mobile Webkit, Firefox, and IE 9/10 support sending objects over postMessage. However, IE8 only supports sending strings over postMessage. A workaround is to use JSON.stringify on all messages sent via postMessage.