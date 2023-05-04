export default class Star {
    canvas;
    constructor(canvas = undefined) {
        this.canvas = canvas;
    }
    draw({canvas = undefined, position = {x: undefined, y: undefined}, outerRadius = 80, innerRadius = 40, numPoints = 5, rotation = 0}) {
        let angle = (2 * Math.PI) / numPoints;
        if (canvas === undefined) {
            canvas = this.canvas;
        }
        let ctx = canvas.getContext('2d');

        let centerX = position.x ?? canvas.width / 2;
        let centerY = position.y ?? canvas.height / 2;

        // Begin drawing the star
        ctx.beginPath();

        // Move to the first point
        ctx.moveTo(centerX + outerRadius * Math.cos(rotation * Math.PI / 180), centerY + outerRadius * Math.sin(rotation * Math.PI / 180));

        // Draw the outer and inner points of the star
        for (var i = 0; i < numPoints; i++) {
            var currentAngle = i * angle + rotation * Math.PI / 180;
            var outerX = centerX + outerRadius * Math.cos(currentAngle);
            var outerY = centerY + outerRadius * Math.sin(currentAngle);
            ctx.lineTo(outerX, outerY);

            var nextAngle = (i + 0.5) * angle + rotation * Math.PI / 180;
            var innerX = centerX + innerRadius * Math.cos(nextAngle);
            var innerY = centerY + innerRadius * Math.sin(nextAngle);
            ctx.lineTo(innerX, innerY);
        }

        // Set the fill style and fill the star
        ctx.fillStyle = "yellow";
        ctx.fill();

        // End drawing the star
        ctx.closePath();        
    }
}