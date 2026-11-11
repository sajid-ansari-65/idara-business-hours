import { __, sprintf } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	TextControl,
	ToggleControl,
	SelectControl,
	Button,
	ColorPalette,
	Flex,
	FlexItem,
	FlexBlock,
} from '@wordpress/components';

/**
 * Local stand-ins for `__experimentalSpacer` and `__experimentalText`.
 *
 * Both are experimental APIs that WordPress may rename or drop without a
 * deprecation cycle — and both are purely presentational here, so plain
 * elements are the safer dependency. Spacing keeps the same 4px grid the
 * Spacer component uses, so the props read identically at the call sites.
 *
 * @param {Object} props              Component props.
 * @param {number} props.marginTop    Top margin, in 4px units.
 * @param {number} props.marginBottom Bottom margin, in 4px units.
 * @return {Element} A spacing element.
 */
function Spacer( { marginTop = 0, marginBottom = 0 } ) {
	return (
		<div
			aria-hidden="true"
			style={ {
				marginTop: marginTop * 4,
				marginBottom: marginBottom * 4,
			} }
		/>
	);
}

/**
 * Small block of inspector text — section labels, help copy, inline notes.
 *
 * @param {Object}  props           Component props.
 * @param {number}  props.size      Font size in px.
 * @param {number}  props.weight    Font weight.
 * @param {boolean} props.upperCase Render in uppercase.
 * @param {string}  props.className Extra class name.
 * @param {Element} props.children  Text content.
 * @return {Element} The text element.
 */
function Text( { size = 13, weight, upperCase, className = '', children } ) {
	return (
		<span
			className={ className }
			style={ {
				display: 'block',
				fontSize: `${ size }px`,
				fontWeight: weight,
				textTransform: upperCase ? 'uppercase' : undefined,
			} }
		>
			{ children }
		</span>
	);
}

/* ── Constants ────────────────────────────────────────────────────────── */
// Display order is Monday-first (index 0 = Monday … 6 = Sunday).
const DAY_LABELS = [
	__( 'Monday', 'idara-business-hours' ),
	__( 'Tuesday', 'idara-business-hours' ),
	__( 'Wednesday', 'idara-business-hours' ),
	__( 'Thursday', 'idara-business-hours' ),
	__( 'Friday', 'idara-business-hours' ),
	__( 'Saturday', 'idara-business-hours' ),
	__( 'Sunday', 'idara-business-hours' ),
];

const BUSINESS_TYPES = [
	'LocalBusiness',
	'Restaurant',
	'CafeOrCoffeeShop',
	'BarOrPub',
	'Bakery',
	'Store',
	'ClothingStore',
	'GroceryStore',
	'HealthAndBeautyBusiness',
	'BeautySalon',
	'HairSalon',
	'MedicalClinic',
	'Dentist',
	'ProfessionalService',
	'LegalService',
	'FinancialService',
	'RealEstateAgent',
	'AutomotiveBusiness',
	'AutoRepair',
	'LodgingBusiness',
	'EntertainmentBusiness',
];

const ACCENT_SWATCHES = [
	{ name: 'Teal', color: '#0f766e' },
	{ name: 'Amber', color: '#b45309' },
	{ name: 'Green', color: '#3f6212' },
	{ name: 'Rose', color: '#9d174d' },
	{ name: 'Indigo', color: '#4f46e5' },
	{ name: 'Slate', color: '#334155' },
];

const TIMEZONES =
	typeof Intl.supportedValuesOf === 'function'
		? Intl.supportedValuesOf( 'timeZone' )
		: [];

/* ── Helpers ──────────────────────────────────────────────────────────── */
function fmtTime( time, format ) {
	if ( ! time ) {
		return '';
	}
	const [ h, m ] = time.split( ':' ).map( Number );
	if ( format === '24' ) {
		return `${ String( h ).padStart( 2, '0' ) }:${ String( m ).padStart(
			2,
			'0'
		) }`;
	}
	const ampm = h < 12 ? 'AM' : 'PM';
	let hr = h % 12;
	if ( hr === 0 ) {
		hr = 12;
	}
	return `${ hr }:${ String( m ).padStart( 2, '0' ) } ${ ampm }`;
}

function dayValue( day, format ) {
	if ( day.closed || ! day.slots || ! day.slots.length ) {
		return __( 'Closed', 'idara-business-hours' );
	}
	return day.slots
		.filter( ( s ) => s.open && s.close )
		.map(
			( s ) =>
				`${ fmtTime( s.open, format ) } – ${ fmtTime(
					s.close,
					format
				) }`
		)
		.join( ', ' );
}

/* ── Reusable slot editor ─────────────────────────────────────────────── */
function SlotEditor( { slots, onChange } ) {
	const update = ( i, key, val ) => {
		const next = slots.map( ( s, idx ) =>
			idx === i ? { ...s, [ key ]: val } : s
		);
		onChange( next );
	};
	const remove = ( i ) => onChange( slots.filter( ( _, idx ) => idx !== i ) );
	const add = () =>
		onChange( [ ...slots, { open: '09:00', close: '17:00' } ] );

	return (
		<div className="idara-bh-slots">
			{ slots.map( ( slot, i ) => (
				<Flex
					key={ i }
					className="idara-bh-slot"
					gap={ 2 }
					align="flex-end"
				>
					<FlexBlock>
						<TextControl
							type="time"
							label={
								i === 0
									? __( 'Open', 'idara-business-hours' )
									: ''
							}
							hideLabelFromVision={ i !== 0 }
							value={ slot.open }
							onChange={ ( v ) => update( i, 'open', v ) }
							__nextHasNoMarginBottom
						/>
					</FlexBlock>
					<FlexBlock>
						<TextControl
							type="time"
							label={
								i === 0
									? __( 'Close', 'idara-business-hours' )
									: ''
							}
							hideLabelFromVision={ i !== 0 }
							value={ slot.close }
							onChange={ ( v ) => update( i, 'close', v ) }
							__nextHasNoMarginBottom
						/>
					</FlexBlock>
					<FlexItem>
						<Button
							icon="trash"
							size="small"
							isDestructive
							label={ __(
								'Remove time range',
								'idara-business-hours'
							) }
							onClick={ () => remove( i ) }
						/>
					</FlexItem>
				</Flex>
			) ) }
			<Button
				variant="link"
				size="small"
				onClick={ add }
				className="idara-bh-add-slot"
			>
				{ __( '+ Add time range', 'idara-business-hours' ) }
			</Button>
		</div>
	);
}

/* ── Edit component ───────────────────────────────────────────────────── */
export default function Edit( { attributes, setAttributes } ) {
	const {
		days,
		specialHours,
		heading,
		timeFormat,
		showStatus,
		highlightToday,
		hideClosedDays,
		accentColor,
		timezoneOverride,
		showSchema,
		businessType,
		businessName,
		streetAddress,
		addressLocality,
		addressRegion,
		postalCode,
		addressCountry,
		telephone,
		priceRange,
		businessUrl,
	} = attributes;

	const blockProps = useBlockProps( {
		className: 'idara-bh idara-bh-editor',
		style: { '--idara-bh-accent': accentColor },
	} );

	/* Weekly-day mutators */
	const setDay = ( i, patch ) => {
		const next = days.map( ( d, idx ) =>
			idx === i ? { ...d, ...patch } : d
		);
		setAttributes( { days: next } );
	};
	const toggleDayClosed = ( i, closed ) =>
		setDay(
			i,
			closed
				? { closed: true }
				: {
						closed: false,
						slots: days[ i ].slots.length
							? days[ i ].slots
							: [ { open: '09:00', close: '17:00' } ],
				  }
		);

	/* Special-hours mutators */
	const setSpecial = ( i, patch ) => {
		const next = specialHours.map( ( s, idx ) =>
			idx === i ? { ...s, ...patch } : s
		);
		setAttributes( { specialHours: next } );
	};
	const addSpecial = () =>
		setAttributes( {
			specialHours: [
				...specialHours,
				{ date: '', closed: true, slots: [], label: '' },
			],
		} );
	const removeSpecial = ( i ) =>
		setAttributes( {
			specialHours: specialHours.filter( ( _, idx ) => idx !== i ),
		} );

	/* Lightweight preview status (business timezone) */
	const previewStatus = ( () => {
		const fmtOptions = {
			weekday: 'short',
			hour: '2-digit',
			minute: '2-digit',
			hour12: false,
		};
		let fmt;
		try {
			fmt = new Intl.DateTimeFormat( 'en-CA', {
				...fmtOptions,
				timeZone: timezoneOverride || undefined,
			} );
		} catch ( e ) {
			// Unknown/invalid IANA zone (pasted markup, browser tz-data gap):
			// preview in the browser zone instead of crashing the block.
			fmt = new Intl.DateTimeFormat( 'en-CA', fmtOptions );
		}
		const parts = {};
		for ( const p of fmt.formatToParts( new Date() ) ) {
			parts[ p.type ] = p.value;
		}
		const map = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
		const todayIdx = map[ parts.weekday ];
		let hour = parseInt( parts.hour, 10 );
		if ( hour === 24 ) {
			hour = 0;
		}
		const mins = hour * 60 + parseInt( parts.minute, 10 );
		const day = days[ todayIdx ] || { closed: true, slots: [] };
		let open = false;
		if ( ! day.closed ) {
			for ( const s of day.slots ) {
				if ( ! s.open || ! s.close ) {
					continue;
				}
				const [ oh, om ] = s.open.split( ':' ).map( Number );
				const [ ch, cm ] = s.close.split( ':' ).map( Number );
				const o = oh * 60 + om;
				const c = ch * 60 + cm;
				if ( c <= o ? mins >= o || mins < c : mins >= o && mins < c ) {
					open = true;
					break;
				}
			}
		}
		return { todayIdx, open };
	} )();

	return (
		<>
			<InspectorControls>
				{ /* === HOURS === */ }
				<PanelBody
					title={ __( 'Weekly hours', 'idara-business-hours' ) }
					initialOpen={ true }
				>
					<Text
						size={ 11 }
						weight={ 600 }
						upperCase
						className="idara-bh-section-label"
					>
						{ __( 'Time format', 'idara-business-hours' ) }
					</Text>
					<div
						className="idara-bh-toggle-group"
						role="group"
						aria-label={ __(
							'Time format',
							'idara-business-hours'
						) }
					>
						<Button
							variant={
								timeFormat === '12' ? 'primary' : 'secondary'
							}
							onClick={ () =>
								setAttributes( { timeFormat: '12' } )
							}
						>
							{ __( '12-hour', 'idara-business-hours' ) }
						</Button>
						<Button
							variant={
								timeFormat === '24' ? 'primary' : 'secondary'
							}
							onClick={ () =>
								setAttributes( { timeFormat: '24' } )
							}
						>
							{ __( '24-hour', 'idara-business-hours' ) }
						</Button>
					</div>

					<Spacer marginTop={ 4 } marginBottom={ 2 } />

					{ days.map( ( day, i ) => (
						<div
							key={ i }
							className={ `idara-bh-day-row ${
								day.closed ? 'is-closed' : ''
							}` }
						>
							<ToggleControl
								label={ DAY_LABELS[ i ] }
								checked={ ! day.closed }
								onChange={ ( on ) =>
									toggleDayClosed( i, ! on )
								}
								__nextHasNoMarginBottom
							/>
							{ ! day.closed ? (
								<SlotEditor
									slots={ day.slots }
									onChange={ ( slots ) =>
										setDay( i, { slots } )
									}
								/>
							) : (
								<Text
									size={ 12 }
									className="idara-bh-closed-tag"
								>
									{ __( 'Closed', 'idara-business-hours' ) }
								</Text>
							) }
						</div>
					) ) }
				</PanelBody>

				{ /* === SPECIAL HOURS === */ }
				<PanelBody
					title={ __(
						'Special / holiday hours',
						'idara-business-hours'
					) }
					initialOpen={ false }
				>
					<Text size={ 12 } className="idara-bh-help">
						{ __(
							'Override the weekly schedule on specific dates (e.g. public holidays).',
							'idara-business-hours'
						) }
					</Text>
					<Spacer marginTop={ 3 } />
					{ specialHours.map( ( sp, i ) => (
						<div key={ i } className="idara-bh-special">
							<Flex align="flex-end" gap={ 2 }>
								<FlexBlock>
									<TextControl
										type="date"
										label={ __(
											'Date',
											'idara-business-hours'
										) }
										value={ sp.date }
										onChange={ ( v ) =>
											setSpecial( i, { date: v } )
										}
										__nextHasNoMarginBottom
									/>
								</FlexBlock>
								<FlexItem>
									<Button
										icon="trash"
										isDestructive
										label={ __(
											'Remove special date',
											'idara-business-hours'
										) }
										onClick={ () => removeSpecial( i ) }
									/>
								</FlexItem>
							</Flex>
							<TextControl
								label={ __(
									'Label (optional)',
									'idara-business-hours'
								) }
								value={ sp.label }
								placeholder={ __(
									'e.g. Christmas Day',
									'idara-business-hours'
								) }
								onChange={ ( v ) =>
									setSpecial( i, { label: v } )
								}
							/>
							<ToggleControl
								label={ __(
									'Open this day',
									'idara-business-hours'
								) }
								checked={ ! sp.closed }
								onChange={ ( on ) =>
									setSpecial(
										i,
										on
											? {
													closed: false,
													slots: sp.slots.length
														? sp.slots
														: [
																{
																	open: '09:00',
																	close: '17:00',
																},
														  ],
											  }
											: { closed: true }
									)
								}
								__nextHasNoMarginBottom
							/>
							{ ! sp.closed && (
								<SlotEditor
									slots={ sp.slots }
									onChange={ ( slots ) =>
										setSpecial( i, { slots } )
									}
								/>
							) }
						</div>
					) ) }
					<Button
						variant="secondary"
						size="small"
						onClick={ addSpecial }
					>
						{ __( '+ Add special date', 'idara-business-hours' ) }
					</Button>
				</PanelBody>

				{ /* === DISPLAY === */ }
				<PanelBody
					title={ __( 'Display', 'idara-business-hours' ) }
					initialOpen={ false }
				>
					<TextControl
						label={ __( 'Heading', 'idara-business-hours' ) }
						value={ heading }
						placeholder={ __(
							'e.g. Opening Hours',
							'idara-business-hours'
						) }
						onChange={ ( v ) => setAttributes( { heading: v } ) }
					/>
					<ToggleControl
						label={ __(
							'Show "Open now" status',
							'idara-business-hours'
						) }
						checked={ showStatus }
						onChange={ ( v ) => setAttributes( { showStatus: v } ) }
						__nextHasNoMarginBottom
					/>
					<Spacer marginTop={ 3 } />
					<ToggleControl
						label={ __(
							'Highlight current day',
							'idara-business-hours'
						) }
						checked={ highlightToday }
						onChange={ ( v ) =>
							setAttributes( { highlightToday: v } )
						}
						__nextHasNoMarginBottom
					/>
					<Spacer marginTop={ 3 } />
					<ToggleControl
						label={ __(
							'Hide closed days',
							'idara-business-hours'
						) }
						checked={ hideClosedDays }
						onChange={ ( v ) =>
							setAttributes( { hideClosedDays: v } )
						}
						__nextHasNoMarginBottom
					/>
					<Spacer marginTop={ 4 } />
					<Text
						size={ 11 }
						weight={ 600 }
						upperCase
						className="idara-bh-section-label"
					>
						{ __( 'Accent color', 'idara-business-hours' ) }
					</Text>
					<ColorPalette
						colors={ ACCENT_SWATCHES }
						value={ accentColor }
						onChange={ ( c ) =>
							setAttributes( { accentColor: c || '#0f766e' } )
						}
						enableAlpha={ false }
						clearable={ false }
					/>
				</PanelBody>

				{ /* === TIMEZONE === */ }
				<PanelBody
					title={ __( 'Timezone', 'idara-business-hours' ) }
					initialOpen={ false }
				>
					<Text size={ 12 } className="idara-bh-help">
						{ __(
							'The live status is calculated in this timezone. Leave as "Site default" unless this location is elsewhere.',
							'idara-business-hours'
						) }
					</Text>
					<Spacer marginTop={ 3 } />
					{ TIMEZONES.length ? (
						<SelectControl
							label={ __(
								'Business timezone',
								'idara-business-hours'
							) }
							value={ timezoneOverride }
							options={ [
								{
									label: __(
										'Site default',
										'idara-business-hours'
									),
									value: '',
								},
								...TIMEZONES.map( ( tz ) => ( {
									label: tz,
									value: tz,
								} ) ),
							] }
							onChange={ ( v ) =>
								setAttributes( { timezoneOverride: v } )
							}
							__nextHasNoMarginBottom
						/>
					) : (
						<TextControl
							label={ __(
								'Business timezone (IANA)',
								'idara-business-hours'
							) }
							value={ timezoneOverride }
							placeholder="Asia/Kolkata"
							onChange={ ( v ) =>
								setAttributes( { timezoneOverride: v } )
							}
						/>
					) }
				</PanelBody>

				{ /* === SCHEMA === */ }
				<PanelBody
					title={ __(
						'LocalBusiness schema (SEO)',
						'idara-business-hours'
					) }
					initialOpen={ false }
				>
					<ToggleControl
						label={ __(
							'Output LocalBusiness JSON-LD',
							'idara-business-hours'
						) }
						help={ __(
							'Adds structured data so search engines can read your hours. Only fields you fill in are included.',
							'idara-business-hours'
						) }
						checked={ showSchema }
						onChange={ ( v ) => setAttributes( { showSchema: v } ) }
					/>
					{ showSchema && (
						<>
							<Spacer marginTop={ 3 } />
							<SelectControl
								label={ __(
									'Business type',
									'idara-business-hours'
								) }
								value={ businessType }
								options={ BUSINESS_TYPES.map( ( t ) => ( {
									label: t,
									value: t,
								} ) ) }
								onChange={ ( v ) =>
									setAttributes( { businessType: v } )
								}
							/>
							<TextControl
								label={ __(
									'Business name',
									'idara-business-hours'
								) }
								help={ __(
									'Defaults to your site title if left blank.',
									'idara-business-hours'
								) }
								value={ businessName }
								onChange={ ( v ) =>
									setAttributes( { businessName: v } )
								}
							/>
							<TextControl
								label={ __(
									'Street address',
									'idara-business-hours'
								) }
								value={ streetAddress }
								onChange={ ( v ) =>
									setAttributes( { streetAddress: v } )
								}
							/>
							<Flex gap={ 2 }>
								<FlexBlock>
									<TextControl
										label={ __(
											'City',
											'idara-business-hours'
										) }
										value={ addressLocality }
										onChange={ ( v ) =>
											setAttributes( {
												addressLocality: v,
											} )
										}
									/>
								</FlexBlock>
								<FlexBlock>
									<TextControl
										label={ __(
											'Region / State',
											'idara-business-hours'
										) }
										value={ addressRegion }
										onChange={ ( v ) =>
											setAttributes( {
												addressRegion: v,
											} )
										}
									/>
								</FlexBlock>
							</Flex>
							<Flex gap={ 2 }>
								<FlexBlock>
									<TextControl
										label={ __(
											'Postal code',
											'idara-business-hours'
										) }
										value={ postalCode }
										onChange={ ( v ) =>
											setAttributes( { postalCode: v } )
										}
									/>
								</FlexBlock>
								<FlexBlock>
									<TextControl
										label={ __(
											'Country',
											'idara-business-hours'
										) }
										value={ addressCountry }
										placeholder="IN"
										onChange={ ( v ) =>
											setAttributes( {
												addressCountry: v,
											} )
										}
									/>
								</FlexBlock>
							</Flex>
							<TextControl
								label={ __(
									'Telephone',
									'idara-business-hours'
								) }
								value={ telephone }
								onChange={ ( v ) =>
									setAttributes( { telephone: v } )
								}
							/>
							<Flex gap={ 2 }>
								<FlexBlock>
									<TextControl
										label={ __(
											'Price range',
											'idara-business-hours'
										) }
										value={ priceRange }
										placeholder="$$"
										onChange={ ( v ) =>
											setAttributes( { priceRange: v } )
										}
									/>
								</FlexBlock>
								<FlexBlock>
									<TextControl
										label={ __(
											'Business URL',
											'idara-business-hours'
										) }
										value={ businessUrl }
										placeholder={ __(
											'Defaults to home',
											'idara-business-hours'
										) }
										onChange={ ( v ) =>
											setAttributes( { businessUrl: v } )
										}
									/>
								</FlexBlock>
							</Flex>
						</>
					) }
				</PanelBody>
			</InspectorControls>

			{ /* ── EDITOR PREVIEW ── */ }
			<div { ...blockProps }>
				{ heading && <p className="idara-bh-heading">{ heading }</p> }

				{ showStatus && (
					<div
						className={ `idara-bh-status ${
							previewStatus.open ? 'is-open' : 'is-closed'
						}` }
					>
						<span
							className="idara-bh-status-dot"
							aria-hidden="true"
						/>
						<span className="idara-bh-status-label">
							{ previewStatus.open
								? __( 'Open now', 'idara-business-hours' )
								: __( 'Closed', 'idara-business-hours' ) }
						</span>
					</div>
				) }

				<table className="idara-bh-table">
					<tbody>
						{ days.map( ( day, i ) => {
							if ( hideClosedDays && day.closed ) {
								return null;
							}
							const isToday =
								highlightToday && i === previewStatus.todayIdx;
							return (
								<tr
									key={ i }
									className={ `idara-bh-row ${
										day.closed ? 'is-closed-day' : ''
									} ${ isToday ? 'idara-bh-today' : '' }` }
								>
									<th scope="row" className="idara-bh-day">
										{ DAY_LABELS[ i ] }
									</th>
									<td className="idara-bh-hours">
										{ dayValue( day, timeFormat ) }
									</td>
								</tr>
							);
						} ) }
					</tbody>
				</table>

				{ specialHours.length > 0 && (
					<Text size={ 11 } className="idara-bh-special-note">
						{ sprintf(
							/* translators: %d: number of special-date overrides. */
							__(
								'%d special date(s) configured',
								'idara-business-hours'
							),
							specialHours.length
						) }
					</Text>
				) }
			</div>
		</>
	);
}
