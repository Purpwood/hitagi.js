(function () {
    'use strict';

    var _ = require('lodash');
    var pixi = require('pixi.js');

    var proxy = require('../utils.js').proxy;

    var PixiRenderSystem = function (stage) {
        var that = this;

        var sprites = {};
        var graphics = {};

        var offset = {
            x: 0,
            y: 0
        };

        // Build the system, called by world on every entity.
        this.build = {
            graphic: function (entity) {
                switch (entity.c.graphic.type) {

                    case 'circle':
                        graphics[entity.uid] = new pixi.Graphics();
                        graphics[entity.uid].beginFill(entity.c.graphic.color);
                        graphics[entity.uid].drawCircle(0, 0, entity.c.graphic.radius);
                        break;

                    case 'line':
                        graphics[entity.uid] = new pixi.Graphics();
                        graphics[entity.uid].lineStyle(
                            entity.c.graphic.thickness,
                            entity.c.graphic.color,
                            1
                        );
                        graphics[entity.uid].moveTo(
                            entity.c.graphic.x1,
                            entity.c.graphic.y1
                        );
                        graphics[entity.uid].lineTo(
                            entity.c.graphic.x2,
                            entity.c.graphic.y2
                        );
                        break;

                    case 'rectangle':
                        graphics[entity.uid] = new pixi.Graphics();
                        graphics[entity.uid].beginFill(entity.c.graphic.color);
                        graphics[entity.uid].drawRect(
                            -entity.c.graphic.width/2,
                            -entity.c.graphic.height/2,
                            entity.c.graphic.width,
                            entity.c.graphic.height
                        );
                        break;

                    case 'sprite':
                        var path = entity.c.graphic.path;

                        if (_.isArray(path) || entity.c.graphic.sheet) {
                            // Animation.
                            var frames;

                            if (entity.c.graphic.sheet) {
                                frames = _.map(path, function (framePath) {
                                    return pixi.Texture.fromFrame(framePath);
                                });
                            } else {
                                frames = _.map(path, function (framePath) {
                                    return pixi.Texture.fromImage(framePath);
                                });
                            }

                            graphics[entity.uid] = new pixi.extras.MovieClip(frames);

                            // Set and proxy framespeed.
                            graphics[entity.uid].animationSpeed = entity.c.graphic.animationSpeed;
                            proxy(
                                entity.c.graphic,
                                'animationSpeed',
                                graphics[entity.uid],
                                'animationSpeed'
                            );
                            graphics[entity.uid].gotoAndPlay(entity.c.graphic.currentFrame);
                        } else {
                            // Static sprite.
                            var texture = pixi.Texture.fromImage(path);
                            graphics[entity.uid] = new pixi.Sprite(texture);
                        }

                        // Set anchor.
                        graphics[entity.uid].anchor = entity.c.graphic.anchor;
                        proxy(
                            entity.c.graphic,
                            'anchor',
                            graphics[entity.uid],
                            'anchor'
                        );

                        // Set and proxy visibility.
                        graphics[entity.uid].visible = entity.c.graphic.visible;
                        proxy(
                            entity.c.graphic,
                            'visible',
                            graphics[entity.uid],
                            'visible'
                        );

                        // Set and proxy rotation.
                        graphics[entity.uid].rotation = entity.c.graphic.rotation;
                        proxy(
                            entity.c.graphic,
                            'rotation',
                            graphics[entity.uid],
                            'rotation'
                        );

                        // Custom proxy to make sure sprite changes properly occur.
                        Object.defineProperty(
                            entity.c.graphic,
                            'path',
                            {
                                get: function () {
                                    return path;
                                },
                                set: function (newValue) {
                                    path = newValue;

                                    // Remove old sprite.
                                    stage.removeChild(graphics[entity.uid]);
                                    delete graphics[entity.uid];

                                    // Add new sprite.
                                    that.build(entity);
                                    that.update(entity);
                                }
                            }
                        );

                        // Custom proxy to make sure frame changes properly occur.
                        Object.defineProperty(
                            entity.c.graphic,
                            'currentFrame',
                            {
                                get: function () {
                                    return graphics[entity.uid].currentFrame;
                                },
                                set: function (newValue) {
                                    graphics[entity.uid].gotoAndPlay(newValue);
                                }
                            }
                        );
                        break;

                    case 'text':
                        // Set and proxy copy.
                        graphics[entity.uid] = new pixi.Text(
                            entity.c.graphic.copy,
                            entity.c.graphic.options
                        );
                        proxy(entity.c.graphic, 'copy', graphics[entity.uid], 'text');
                        break;

                    default:
                        throw new Error('InvalidGraphicType');
                }

                // Set and proxy alpha.
                graphics[entity.uid].alpha = entity.c.graphic.alpha;
                proxy(
                    entity.c.graphic,
                    'alpha',
                    graphics[entity.uid],
                    'alpha'
                );

                stage.addChild(graphics[entity.uid]);
            }
        };

        // Destroy an entity from the system.
        this.destroy = {
            graphic: function (entity) {
                var id = entity.uid;

                if (_.has(graphics, id)) {
                    stage.removeChild(graphics[id]);
                }

                delete graphics[id];
            }
        };

        this.update = {
            graphic: function (entity)  {
                var graphic = graphics[entity.uid];

                var x = 0;
                var y = 0;

                if (entity.c.graphic.relative) {
                    x = entity.c.position.x + offset.x;
                    y = entity.c.position.y + offset.y;
                }

                graphic.position.x = x;
                graphic.position.y = y;
            }

        };

         // Preload assets.
        this.load = function (assets, callback) {
            var loader = new pixi.loaders.Loader();

            if (!_.isArray(assets)) {
                assets = [assets];
            }
            _.each(assets, function (asset) {
                loader.add(asset, asset);
            });

            if (callback) {
                loader.once('complete', callback);
            }
            loader.load();
        };
    };

    module.exports = PixiRenderSystem;
} ());
