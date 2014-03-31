/**
 * Base class for entities that are visible but have no physical body
 */
var VisualEntity	= Entity.extend({
	cAnimState : null,

	fRotation : 0.0,

	init : function(cAnimState) {
		this.setAnim(cAnimState);
	},

	setAnim : function(cAnim) {
		this.cAnimState	= cAnim;
	},

	getAnim : function() {
		return this.cAnimState;
	},

	setRot : function(fRot) {
		this.fRotation	= fRot;
	},

	getRot : function() {
		return this.fRotation;
	}
});