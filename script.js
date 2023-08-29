var key = "rf_ACrZ7Hz8DRUB1NBMMtDoQK84Hf22";
var width = 1280;
var video = null;
var height = 960;
console.log("HI");
var bounding_box_colors = {};
var color_choices = [
    "#C7FC00",
    "#FF00FF",
    "#8622FF",
    "#FE0056",
    "#00FFCE",
    "#FF8000",
    "#00B7EB",
    "#FFFF00",
    "#0E7AFE",
    "#FFABAB",
    "#0000FF",
    "#CCCCCC",
];
var model = null;
async function getModel() {
    // if (available_models[current_model_name]["model"] != null) {
    //     return available_models[current_model_name]["model"];
    // }

    var model = await roboflow
    .auth({
        publishable_key: key,
    })
    .load({
        model: "melee",
        version: 5,
    });

    model.configure({
        threshold: .3,
        max_objects: 50
    });

    // document.getElementById("video_source").src = available_models[current_model_name]["video"];
    // document.getElementById("video").load();
    // document.getElementById("video").play();

    // available_models[current_model_name]["model"] = model;

    return model;
}
function drawBoundingBoxes(predictions, canvas, ctx, scalingRatio, sx, sy, fromDetectAPI = false) {
    for (var i = 0; i < predictions.length; i++) {
    var confidence = predictions[i].confidence;
    ctx.scale(1, 1);

    if (predictions[i].class in bounding_box_colors) {
        ctx.strokeStyle = bounding_box_colors[predictions[i].class];
    } else {
        // random color
        var color =
        color_choices[Math.floor(Math.random() * color_choices.length)];
        ctx.strokeStyle = color;
        // remove color from choices
        color_choices.splice(color_choices.indexOf(color), 1);

        bounding_box_colors[predictions[i].class] = color;
    }

    var prediction = predictions[i];
    var x = prediction.bbox.x - prediction.bbox.width / 2;
    var y = prediction.bbox.y - prediction.bbox.height / 2;
    var width = prediction.bbox.width;
    var height = prediction.bbox.height;

    if (!fromDetectAPI) {
        x -= sx;
        y -= sy;

        x *= scalingRatio;
        y *= scalingRatio;
        width *= scalingRatio;
        height *= scalingRatio;
    }

    // if box is partially outside 640x480, clip it
    if (x < 0) {
        width += x;
        x = 0;
    }

    if (y < 0) {
        height += y;
        y = 0;
    }

    // if first prediction, double label size


    ctx.rect(x, y, width, width);

    ctx.fillStyle = "rgba(0, 0, 0, 0)";
    ctx.fill();

    ctx.fillStyle = ctx.strokeStyle;
    ctx.lineWidth = "4";
    ctx.strokeRect(x, y, width, height);
    // put colored background on text
    var text = ctx.measureText(
        prediction.class + " " + Math.round(confidence * 100) + "%"
    );
    // if (i == 0) {
    //     text.width *= 2;
    // }

    // set x y fill text to be within canvas x y, even if x is outside
    // if (y < 0) {
    //     y = -40;
    // }
    if (y < 20) {
        y = 30
    }

    // make sure label doesn't leave canvas

    ctx.fillStyle = ctx.strokeStyle;
    ctx.fillRect(x - 2, y - 30, text.width + 4, 30);
    // use monospace font
    ctx.font = "15px monospace";
    // use black text
    ctx.fillStyle = "black";

    ctx.fillText(
        prediction.class + " " + Math.round(confidence * 100) + "%",
        x,
        y - 10
    );
    }
}
function getCoordinates(img) {
    var dx = 0;
    var dy = 0;
    var dWidth = width;
    var dHeight = height;

    var sy;
    var sx;
    var sWidth = 0;
    var sHeight = 0;

    var imageWidth = img.width;
    var imageHeight = img.height;

    const canvasRatio = dWidth / dHeight;
    const imageRatio = imageWidth / imageHeight;

    // scenario 1 - image is more vertical than canvas
    if (canvasRatio >= imageRatio) {
        var sx = 0;
        var sWidth = imageWidth;
        var sHeight = sWidth / canvasRatio;
        var sy = (imageHeight - sHeight) / 2;
    } else {
    // scenario 2 - image is more horizontal than canvas
        var sy = 0;
        var sHeight = imageHeight;
        var sWidth = sHeight * canvasRatio;
        var sx = (imageWidth - sWidth) / 2;
    }

    var scalingRatio = dWidth / sWidth;

    if (scalingRatio == Infinity) {
        scalingRatio = 1;
    }

    return [sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight, scalingRatio];
}
var canvas = document.getElementById("video_canvas");
var ctx = canvas.getContext("2d");
var canvas_painted = false;
function webcamInference() {
    // if no model, load it
    if (model == null) {
        model = getModel();
    }
    navigator.mediaDevices
        .getDisplayMedia({ video: true, audio: false })
        .then(function (stream) {
        // if video exists, show it
        // create video element
        var canvas = document.getElementById("video_canvas");
        var ctx = canvas.getContext("2d");
        if (!video){
        video = document.createElement("video");
        }
        video.srcObject = stream;
        video.id = "video1";
        video.setAttribute("playsinline", "")
        video.setAttribute("muted", "")
        document.getElementById("video_canvas").after(video);
        video.onloadedmetadata = function() {
            video.play();
        }
        video.onplay = function () {
            height = video.videoHeight;
            width = video.videoWidth;
    
            video.setAttribute("width", width);
            video.setAttribute("height", height);
            video.style.width = width + "px";
            video.style.height = height + "px";

            canvas.style.width = width + "px";
            canvas.style.height = height + "px";
            canvas.width = width;
            canvas.height = height;
        }

        video.style.display = "none";
        ctx.scale(1, 1);

        video.addEventListener(
            "loadeddata",
            function () {
            var loopID = setInterval(function () {
        
                var [sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight, scalingRatio] =
                getCoordinates(video);
                model.then(function (model) {
                model.detect(video).then(function (predictions) {
                    video.width = width;
                    video.height = height;
                    ctx.drawImage(video, 0, 0, width, height, 0, 0, width, height);

                    ctx.beginPath();

                    drawBoundingBoxes(predictions, canvas, ctx, scalingRatio, sx, sy);
                });
                });
            }, 1000 / 30);},
            false
        );
    });
}
webcamInference();