"""
PDF Export Service — generates a printable boarding-pass-style itinerary.

Uses ReportLab (pure-Python, no system deps).  Falls back gracefully if
ReportLab is not installed (returns None so the route can 404 cleanly).
"""

from __future__ import annotations
import io
from datetime import datetime

try:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.lib.colors import HexColor, white, black
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
    )
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_CENTER, TA_LEFT
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False


# Brand colours (Amazon palette)
NAVY   = '#131921'
ORANGE = '#e47911'
TEAL   = '#007185'
LIGHT  = '#f7f8f8'
BORDER = '#d5d9d9'


def generate_trip_pdf(trip, stops: list) -> bytes | None:
    """
    Build a PDF for the given trip and return raw bytes.
    Returns None if ReportLab is not available.
    """
    if not REPORTLAB_AVAILABLE:
        return None

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=16 * mm,
        bottomMargin=16 * mm,
        title=f'Traveloop — {trip.name}',
        author='Traveloop',
    )

    styles = getSampleStyleSheet()
    story  = []

    # ── Header banner ─────────────────────────────────────────────────────
    header_style = ParagraphStyle(
        'Header',
        parent=styles['Normal'],
        fontSize=22,
        fontName='Helvetica-Bold',
        textColor=HexColor(ORANGE),
        spaceAfter=2 * mm,
    )
    sub_style = ParagraphStyle(
        'Sub',
        parent=styles['Normal'],
        fontSize=10,
        textColor=HexColor('#6b7777'),
        spaceAfter=4 * mm,
    )
    section_style = ParagraphStyle(
        'Section',
        parent=styles['Normal'],
        fontSize=12,
        fontName='Helvetica-Bold',
        textColor=HexColor(NAVY),
        spaceBefore=6 * mm,
        spaceAfter=2 * mm,
    )
    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontSize=9,
        textColor=HexColor('#333a3a'),
        leading=14,
    )
    small_style = ParagraphStyle(
        'Small',
        parent=styles['Normal'],
        fontSize=8,
        textColor=HexColor('#6b7777'),
    )

    story.append(Paragraph('✦ Traveloop', header_style))
    story.append(Paragraph('Boarding Itinerary', sub_style))
    story.append(HRFlowable(width='100%', thickness=2, color=HexColor(ORANGE), spaceAfter=4 * mm))

    # ── Trip summary ──────────────────────────────────────────────────────
    story.append(Paragraph(trip.name, section_style))

    meta_rows = []
    if trip.description:
        meta_rows.append(['Description', trip.description])
    if trip.start_date:
        date_str = f"{trip.start_date.strftime('%d %b %Y')} → {trip.end_date.strftime('%d %b %Y') if trip.end_date else 'Open-ended'}"
        meta_rows.append(['Dates', date_str])
    if trip.duration_days:
        meta_rows.append(['Duration', f'{trip.duration_days} days'])
    meta_rows.append(['Stops', str(len(stops))])
    meta_rows.append(['Generated', datetime.utcnow().strftime('%d %b %Y %H:%M UTC')])

    if meta_rows:
        t = Table(meta_rows, colWidths=[40 * mm, 130 * mm])
        t.setStyle(TableStyle([
            ('FONTNAME',  (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE',  (0, 0), (-1, -1), 9),
            ('TEXTCOLOR', (0, 0), (0, -1), HexColor(TEAL)),
            ('TEXTCOLOR', (1, 0), (1, -1), HexColor('#1a1f1f')),
            ('ROWBACKGROUNDS', (0, 0), (-1, -1), [HexColor(LIGHT), white]),
            ('TOPPADDING',  (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(t)

    story.append(Spacer(1, 6 * mm))

    # ── Stops ─────────────────────────────────────────────────────────────
    for idx, stop in enumerate(stops):
        city = stop.city
        city_name = city.name if city else 'Unknown'
        country   = city.country if city else ''

        story.append(HRFlowable(width='100%', thickness=0.5, color=HexColor(BORDER), spaceAfter=2 * mm))
        story.append(Paragraph(
            f'Stop {idx + 1} — {city_name}, {country}',
            section_style
        ))

        if stop.start_date:
            story.append(Paragraph(
                f'{stop.start_date.strftime("%d %b")} → {stop.end_date.strftime("%d %b %Y") if stop.end_date else "—"}',
                small_style
            ))
            story.append(Spacer(1, 2 * mm))

        activities = stop.activities.all()
        if activities:
            act_data = [['#', 'Activity', 'Category', 'Duration', 'Cost']]
            for i, sa in enumerate(activities, 1):
                act = sa.activity
                if act:
                    act_data.append([
                        str(i),
                        act.name,
                        act.category.title(),
                        f'{act.duration_hours}h',
                        f'${act.cost:.2f}',
                    ])

            act_table = Table(act_data, colWidths=[8 * mm, 72 * mm, 28 * mm, 18 * mm, 18 * mm])
            act_table.setStyle(TableStyle([
                ('BACKGROUND',   (0, 0), (-1, 0), HexColor(NAVY)),
                ('TEXTCOLOR',    (0, 0), (-1, 0), white),
                ('FONTNAME',     (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE',     (0, 0), (-1, -1), 8),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, HexColor(LIGHT)]),
                ('GRID',         (0, 0), (-1, -1), 0.3, HexColor(BORDER)),
                ('TOPPADDING',   (0, 0), (-1, -1), 3),
                ('BOTTOMPADDING',(0, 0), (-1, -1), 3),
                ('LEFTPADDING',  (0, 0), (-1, -1), 4),
                ('ALIGN',        (3, 0), (-1, -1), 'RIGHT'),
            ]))
            story.append(act_table)
        else:
            story.append(Paragraph('No activities scheduled for this stop.', small_style))

        story.append(Spacer(1, 3 * mm))

    # ── Footer ────────────────────────────────────────────────────────────
    story.append(HRFlowable(width='100%', thickness=1, color=HexColor(ORANGE), spaceBefore=4 * mm))
    story.append(Paragraph(
        'Generated by Traveloop · Plan smarter. Travel better.',
        ParagraphStyle('Footer', parent=styles['Normal'], fontSize=7,
                       textColor=HexColor('#8d9494'), alignment=TA_CENTER)
    ))

    doc.build(story)
    return buf.getvalue()
