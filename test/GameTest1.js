var GameTest1	= Class.extend({
	IMAGE_JSON_NAME : "grits_effects.json",

	cUpdateHandle : null,

	cPlayer : null,

	cAtlasParser : null,
	cAtlasRenderer : null,

	// cEntityManager : null,
	aProjList : [],
	aWallList : null,

	cInputManager : null,

	cLoader : null,

	cPhysicsManager : null,

	cSoundLoader : null,
	cSoundManager : null,

	cStage : null,

	zRafFunc : null,

	iLastUpdate : 0,

	init : function() {
		// get game update function
		this.zRafFunc		= Utils.getRafFunc();

		// init stage for this test
		this.cStage			= document.getElementById("stage");
		// arbitrary width and height
		this.cStage.width	=
		this.cStage.height	= 256;

		// first define all managers that have no prerequisites
		this.cLoader			= new Loader();
		// this.cEntityManager		= new EntityManager();
		this.cInputManager		= new InputManager(
			new KeyboardManager(document.body),
			new MouseManager(this.cStage)
		);
		this.cPhysicsManager	= new PhysicsManager(new b2.Vec2(0, 0), false);

		this.cPhysicsManager.addContactListener({
			PostSolve : this.onContact
		});

		// add key bindings
		this.cInputManager.bindAction(KeyCodes.W, Actions.MOVE_UP);
		this.cInputManager.bindAction(KeyCodes.A, Actions.MOVE_LEFT);
		this.cInputManager.bindAction(KeyCodes.S, Actions.MOVE_DOWN);
		this.cInputManager.bindAction(KeyCodes.D, Actions.MOVE_RIGHT);
		
		this.cInputManager.bindAction(KeyCodes.ARROW_UP, Actions.FIRE_UP);
		this.cInputManager.bindAction(KeyCodes.ARROW_LEFT, Actions.FIRE_LEFT);
		this.cInputManager.bindAction(KeyCodes.ARROW_DOWN, Actions.FIRE_DOWN);
		this.cInputManager.bindAction(KeyCodes.ARROW_RIGHT, Actions.FIRE_RIGHT);

		// first load data files that tell us where other assets can be found
		this.cLoader.queue("data/" + this.IMAGE_JSON_NAME);

		// start loading
		this.cLoader.startQueue(this.onDataLoaded, this);
	},

	onDataLoaded : function(cData) {
		// console.log("cData = " , cData);

		// parse data
		this.cAtlasParser	= new AtlasParser();
		this.cAtlasParser.parse(cData[this.IMAGE_JSON_NAME]);

		// determine image assets to be loaded
		this.cLoader.queue("images/" + this.cAtlasParser.getAtlasName());

		// start loading
		this.cLoader.startQueue(this.onImagesLoaded, this);
	},

	onImagesLoaded : function(cData) {
		// init atlas renderer
		this.cAtlasRenderer	= new AtlasRenderer(this.cStage, cData[this.cAtlasParser.getAtlasName()]);

		// define sound loader
		this.cSoundLoader	= new SoundLoader(this.cLoader, new (Utils.getAudioContextClass())());

		// start loading
		/*this.cSoundLoader.loadSounds(
			["sounds/" + SoundNames.BG_GAME],
			Utils.bindFunc(this, this.onSoundsLoaded)
		);*/

		// skipping sound loading for dev
		this.onSoundsLoaded();
	},

	onSoundsLoaded : function() {
		// define sound manager
		this.cSoundManager	= new SoundManager(this.cSoundLoader);

		// start game
		this.startGame();
	},

	startGame : function() {
		console.log("start game!");

		// Apparently I decided I have to create the sounds first :s
		this.cSoundManager.createSoundList(this.cSoundLoader.cSoundMap);

		// start BG music
		// this.cSoundManager.getSound(SoundNames.BG_GAME).setVolume(0.1);
		// this.cSoundManager.loopSound(SoundNames.BG_GAME, 0);

		// init player
		this.cPlayer	= new PlayerEntity(
			this.cPhysicsManager.addBody({
				cPos : new b2.Vec2(this.cStage.width / 2, this.cStage.height / 2),
				cDim : new b2.Vec2(50.0, 50.0)
			})
		);

		this.cPlayer.initLegAnim(
			new AnimInfo(
				Object.keys(this.cAtlasParser.cImageMap),
				SequenceNames.WALK_RIGHT
			)
		);

		var cProjAnim	= new AnimInfo(
			Object.keys(this.cAtlasParser.cImageMap),
			SequenceNames.MACHGUN_PROJECTILE
		);
		var cMachGun	= new WeaponInfo(cProjAnim, "machgun", 60.0 * 20, 1.0, 200);

		this.cPlayer.setWeaponState(
			new WeaponState(cMachGun)
		);
		this.cPlayer.getWeaponState().setAmmoLeft(10);

		this.cPlayer.setTurretName(ImageNames.TURRET);
		this.cPlayer.setMoveSpeed(60.0 * 5);

		this.createWalls();

		// start update loop
		this.iLastUpdate	= Date.now();
		this.update();
	},

	createWalls : function() {
		var fThickness	= 10.0;

		var cLeft	= new PhysicsEntity(
			this.cPhysicsManager.addBody({
				cPos : new b2.Vec2(0, this.cStage.height / 2),
				cDim : new b2.Vec2(fThickness, this.cStage.height),
				sType : "static"
			})
		);

		var cRight	= new PhysicsEntity(
			this.cPhysicsManager.addBody({
				cPos : new b2.Vec2(this.cStage.width, this.cStage.height / 2),
				cDim : new b2.Vec2(fThickness, this.cStage.height),
				sType : "static"
			})
		);

		var cTop	= new PhysicsEntity(
			this.cPhysicsManager.addBody({
				cPos : new b2.Vec2(this.cStage.width / 2, 0),
				cDim : new b2.Vec2(this.cStage.width, fThickness),
				sType : "static"
			})
		);

		var cBottom	= new PhysicsEntity(
			this.cPhysicsManager.addBody({
				cPos : new b2.Vec2(this.cStage.width / 2, this.cStage.height),
				cDim : new b2.Vec2(this.cStage.width, fThickness),
				sType : "static"
			})
		);

		this.aWallList	= [cLeft, cRight, cTop, cBottom];
	},

	updateInput : function() {
		var cActionMap	= this.cInputManager.getLiveActions();

		// movement
		var cMoveVec	= new b2.Vec2(0, 0);

		if (cActionMap[Actions.MOVE_UP])	cMoveVec.y	-= 1.0;
		if (cActionMap[Actions.MOVE_DOWN]) 	cMoveVec.y	+= 1.0;
		if (cActionMap[Actions.MOVE_LEFT]) 	cMoveVec.x	-= 1.0;
		if (cActionMap[Actions.MOVE_RIGHT])	cMoveVec.x	+= 1.0;

		cMoveVec.Normalize();
		cMoveVec.Multiply(this.cPlayer.getMoveSpeed());

		this.cPlayer.setVelocity(cMoveVec.x, cMoveVec.y);

		// firing
		var cFireVec	= new b2.Vec2(0, 0);

		if (cActionMap[Actions.FIRE_UP])	cFireVec.y	-= 1.0;
		if (cActionMap[Actions.FIRE_DOWN]) 	cFireVec.y	+= 1.0;
		if (cActionMap[Actions.FIRE_LEFT]) 	cFireVec.x	-= 1.0;
		if (cActionMap[Actions.FIRE_RIGHT])	cFireVec.x	+= 1.0;

		cFireVec.Normalize();

		this.cPlayer.setFireVec(cFireVec.x, cFireVec.y);
	},

	updatePlayer : function(iTime) {
		this.cPlayer.update(iTime);

		if (this.cPlayer.getVelocity().LengthSquared() > 0)
			this.cPlayer.getLegAnim().stepFrames(1);

		if (this.cPlayer.getFireVec().LengthSquared() > 0)
			if (this.cPlayer.getWeaponState().tryFire())
			{
				// create projectile outside of owner's bounds, otherwise it will hit them...
				// should look at improving this later.
				var cPos	= this.cPlayer.getPos();
				var cOffset	= this.cPlayer.getFireVec();

				cOffset.Multiply(this.cPlayer.getDim().x + 3.0);
				cPos.Add(cOffset);

				var cProj	= new Projectile(
					this.cPhysicsManager.addBody({
						cPos : cPos,
						cDim : new b2.Vec2(2.0, 2.0)
					}),
					new AnimState(
						this.cPlayer.getWeaponState().getInfo().getAnimInfo()
					),
					this.cPlayer,
					0.0
				);

				cProj.getPhysicsBody().SetBullet(true);
				cProj.getPhysicsBody().SetAngle(this.cPlayer.getTurretRot());

				cProj.setOnContact(function(cOtherEnt) {
					this.flagKilled();
				});

				var cVel	= this.cPlayer.getFireVec();
				cVel.Multiply(this.cPlayer.getWeaponState().getInfo().getProjSpeed());

				cProj.setVelocity(cVel.x, cVel.y);

				this.aProjList.push(cProj);
			}
	},

	render : function() {
		// clear stage
		this.cStage.width	= this.cStage.width;

		// draw player

		// legs
		var cCtx	= this.cStage.getContext("2d");

		var cPos	= this.cPlayer.getPos();
		var fRot	= this.cPlayer.getLegRot();

		cCtx.translate(cPos.x, cPos.y);
		cCtx.rotate(fRot);

		this.cAtlasRenderer.draw(
			this.cAtlasParser.getImageData(
				this.cPlayer.getLegAnim().getCurrentName()
			)
		);

		cCtx.setTransform(1, 0, 0, 1, 0, 0);
		
		// body
		fRot		= this.cPlayer.getTurretRot();

		cCtx.translate(cPos.x, cPos.y);
		cCtx.rotate(fRot);

		this.cAtlasRenderer.draw(
			this.cAtlasParser.getImageData(
				this.cPlayer.getTurretName()
			)
		);

		cCtx.setTransform(1, 0, 0, 1, 0, 0);

		// draw projectiles
		var cProj;

		for (var i in this.aProjList)
		{
			cProj	= this.aProjList[i];

			cCtx.translate(cProj.getPos().x, cProj.getPos().y);
			cCtx.rotate(cProj.getPhysicsBody().GetAngle() + Math.PI);

			this.cAtlasRenderer.draw(
				this.cAtlasParser.getImageData(
					cProj.getAnim().getCurrentName()
				)
			);

			cCtx.setTransform(1, 0, 0, 1, 0, 0);
		}

		var cArea;

		// draw player hit rect
		cArea	= new Rect(this.cPlayer.getPos().x, this.cPlayer.getPos().y, this.cPlayer.getDim().x, this.cPlayer.getDim().y);
		cArea.offset(-this.cPlayer.getDim().x / 2, -this.cPlayer.getDim().y / 2);

		cCtx.translate(cArea.midPoint().x, cArea.midPoint().y);
		cCtx.rotate(this.cPlayer.getLegRot());

		cCtx.beginPath();
		cCtx.strokeStyle	= "green";
		cCtx.strokeRect(-cArea.w / 2, -cArea.h / 2, cArea.w, cArea.h);
		cCtx.closePath();

		cCtx.setTransform(1, 0, 0, 1, 0, 0);

		// draw walls
		this.aWallList.forEach(function(cItem) {
			cArea	= new Rect(cItem.getPos().x, cItem.getPos().y, cItem.getDim().x, cItem.getDim().y);			
			cArea.offset(-cItem.getDim().x / 2, -cItem.getDim().y / 2);

			cCtx.beginPath();
			cCtx.fillStyle	= "red";
			cCtx.fillRect(cArea.x, cArea.y, cArea.w, cArea.h);
			cCtx.closePath();
		});
	},

	onContact : function(cBodyA, cBodyB, aImpulses) {
		// console.log("cBodyA = " , cBodyA);
		// console.log("cBodyB = " , cBodyB);
		// console.log("aImpulses = " , aImpulses);

		var cEntA	= cBodyA.GetUserData();
		var cEntB	= cBodyB.GetUserData();

		cEntA.onContact(cEntB);
		cEntB.onContact(cEntA);
	},

	update : function() {
		// update logic here
		var iTimeNow	= Date.now();
		var iTime		= iTimeNow - this.iLastUpdate;

		this.updateInput();
		this.cPhysicsManager.update();

		this.updatePlayer(iTime);

		this.aProjList.forEach(function(cItem) {
			cItem.update();
		});

		for (var i = this.aProjList.length - 1; i >= 0; --i)
		{
			if (this.aProjList[i].getIsKilled())
			{
				// console.log("Die!!!");

				this.cPhysicsManager.removeBody(
					this.aProjList[i].getPhysicsBody()
				);
				this.aProjList.splice(i, 1);
			}
		}

		this.render();

		this.iLastUpdate	= iTimeNow;

		// create next update handle here
		this.cUpdateHandle	= this.zRafFunc.call(null, Utils.bindFunc(this, this.update));
	}
});