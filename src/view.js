/**
 * Idara Business Hours — frontend view module (WordPress Interactivity API).
 *
 * Auto-enqueued by WordPress only on pages where the block is present
 * (via `viewScriptModule` in block.json). Computes the live "Open now / Closed"
 * status in the visitor's browser against the *business* timezone, so it stays
 * accurate even when the page HTML is served from a CDN or page cache.
 *
 * It writes the result back into the block context (statusLabel / statusHint /
 * isOpen / todayIndex), which the server-rendered markup binds to via
 * data-wp-text and data-wp-class. The server also seeds those values as a
 * no-JS fallback, so this only ever *refines* what is already on screen.
 */
import { store, getContext } from '@wordpress/interactivity';

/* ── Pure helpers ─────────────────────────────────────────────────────── */
function toMinutes( time ) {
	const [ h, m ] = String( time ).split( ':' ).map( Number );
	return h * 60 + m;
}

/**
 * Read "now" in the given IANA timezone as { dateStr, dayIndex (Mon=0), minutes }.
 *
 * @param {string} tz IANA timezone identifier (empty falls back to the browser zone).
 * @return {{dateStr: string, dayIndex: number, minutes: number}} Localised now-parts.
 */
function nowInZone( tz ) {
	const fmt = new Intl.DateTimeFormat( 'en-CA', {
		timeZone: tz || undefined,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		weekday: 'short',
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
	} );
	const parts = {};
	for ( const p of fmt.formatToParts( new Date() ) ) {
		parts[ p.type ] = p.value;
	}
	let hour = parseInt( parts.hour, 10 );
	if ( hour === 24 ) {
		hour = 0; // some engines emit "24" for midnight.
	}
	const weekdayToIndex = {
		Mon: 0,
		Tue: 1,
		Wed: 2,
		Thu: 3,
		Fri: 4,
		Sat: 5,
		Sun: 6,
	};
	return {
		dateStr: `${ parts.year }-${ parts.month }-${ parts.day }`,
		dayIndex: weekdayToIndex[ parts.weekday ],
		minutes: hour * 60 + parseInt( parts.minute, 10 ),
	};
}

/**
 * Resolve the schedule that applies on a given date (special override wins).
 *
 * @param {Object} ctx      Block context (days + special).
 * @param {string} dateStr  Date as YYYY-MM-DD in the business timezone.
 * @param {number} dayIndex Weekday index, Monday = 0.
 * @return {{closed: boolean, slots: Array}} The day's resolved schedule.
 */
function scheduleFor( ctx, dateStr, dayIndex ) {
	const special = ( ctx.special || [] ).find( ( s ) => s.date === dateStr );
	if ( special ) {
		return { closed: !! special.closed, slots: special.slots || [] };
	}
	const day = ( ctx.days || [] )[ dayIndex ] || { closed: true, slots: [] };
	return { closed: !! day.closed, slots: day.slots || [] };
}

/**
 * Compute { isOpen, statusLabel, statusHint, todayIndex } for the block context.
 *
 * @param {Object} ctx Block context (tz, days, special, labels, dayNames).
 * @return {{isOpen: boolean, todayIndex: number, statusLabel: string, statusHint: string}} Live status.
 */
function computeStatus( ctx ) {
	const L = ctx.labels || {};
	const now = nowInZone( ctx.tz );
	const today = scheduleFor( ctx, now.dateStr, now.dayIndex );

	// Open right now?
	let isOpen = false;
	let activeCloseFmt = '';
	if ( ! today.closed ) {
		for ( const slot of today.slots ) {
			const o = toMinutes( slot.open );
			const c = toMinutes( slot.close );
			const within =
				c <= o
					? now.minutes >= o || now.minutes < c // crosses midnight
					: now.minutes >= o && now.minutes < c;
			if ( within ) {
				isOpen = true;
				activeCloseFmt = slot.closeFmt;
				break;
			}
		}
	}

	if ( isOpen ) {
		return {
			isOpen: true,
			todayIndex: now.dayIndex,
			statusLabel: L.open || 'Open now',
			statusHint: ( L.closesAt || 'Closes at %s' ).replace(
				'%s',
				activeCloseFmt
			),
		};
	}

	// Closed — find the next opening to show a helpful hint.
	let hint = '';

	// 1) A later slot today?
	let nextToday = null;
	if ( ! today.closed ) {
		for ( const slot of today.slots ) {
			if ( toMinutes( slot.open ) > now.minutes ) {
				if (
					! nextToday ||
					toMinutes( slot.open ) < toMinutes( nextToday.open )
				) {
					nextToday = slot;
				}
			}
		}
	}
	if ( nextToday ) {
		hint = ( L.opensAt || 'Opens at %s' ).replace(
			'%s',
			nextToday.openFmt
		);
	} else {
		// 2) Scan the upcoming weekly days.
		for ( let n = 1; n <= 7; n++ ) {
			const idx = ( now.dayIndex + n ) % 7;
			const day = ( ctx.days || [] )[ idx ];
			if ( ! day || day.closed || ! day.slots.length ) {
				continue;
			}
			let first = day.slots[ 0 ];
			for ( const slot of day.slots ) {
				if ( toMinutes( slot.open ) < toMinutes( first.open ) ) {
					first = slot;
				}
			}
			const dayName = ( ctx.dayNames || [] )[ idx ] || '';
			hint = ( L.opensDay || 'Opens %1$s at %2$s' )
				.replace( '%1$s', dayName )
				.replace( '%2$s', first.openFmt );
			break;
		}
	}

	return {
		isOpen: false,
		todayIndex: now.dayIndex,
		statusLabel: L.closed || 'Closed',
		statusHint: hint,
	};
}

/* ── Store ────────────────────────────────────────────────────────────── */
const { state } = store( 'idara/business-hours', {
	state: {
		/** Per-row: is this the current weekday? (used by data-wp-class--idara-bh-today) */
		get isToday() {
			const ctx = getContext();
			return !! ctx.highlightToday && ctx.dayIndex === ctx.todayIndex;
		},
	},
	callbacks: {
		/**
		 * Recompute on mount, then refresh every 30s so the status flips at the
		 * exact open/close minute without a page reload.
		 */
		refreshStatus() {
			const ctx = getContext();

			const apply = () => {
				let next;
				try {
					next = computeStatus( ctx );
				} catch ( e ) {
					// This browser can't resolve the business timezone (tz-data
					// gap vs PHP). Keep the server-rendered status untouched.
					return false;
				}
				ctx.isOpen = next.isOpen;
				ctx.statusLabel = next.statusLabel;
				ctx.statusHint = next.statusHint;
				ctx.todayIndex = next.todayIndex;
				return true;
			};

			if ( ! apply() ) {
				return;
			}
			const timer = setInterval( apply, 30000 );
			return () => clearInterval( timer );
		},
	},
} );

export { state };
