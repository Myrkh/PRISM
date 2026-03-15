"""
PRISM SIL Engine — Lambda Database
Sprint G — v0.7.0

Source : PDS Data Handbook, 2021 Edition
         SINTEF Digital, Trondheim, May 2021
         ISBN/DOI : see handbook preface

Toutes les valeurs de taux de défaillance sont stockées en [1/h].
Les tableaux PDS expriment les λ en [10⁻⁶/h] — conversion appliquée à l'entrée.

Usage typique :
    from lambda_db import get_lambda, make_subsystem_params
    entry = get_lambda("pressure_transmitter")
    params = make_subsystem_params(entry, T1=8760.0, MTTR=8.0, architecture="1oo2")

Structure d'une entrée (PDSEntry) :
    key             str     — identifiant unique snake_case
    description     str     — libellé complet
    category        str     — catégorie d'équipement
    lambda_crit     float|None  — taux total de défaillances critiques [1/h]
    lambda_S        float|None  — taux défaillances sûres [1/h]
    lambda_D        float|None  — taux défaillances dangereuses [1/h]
    lambda_DU       float   — taux DU (principal paramètre PRISM) [1/h]
    lambda_DU_70    float|None  — borne supérieure 70% de λ_DU [1/h]
    lambda_DU_90_lo float|None  — borne inférieure IC 90% de λ_DU [1/h]
    lambda_DU_90_hi float|None  — borne supérieure IC 90% de λ_DU [1/h]
    lambda_DD       float   — calculé : lambda_D - lambda_DU [1/h]
    DC              float   — couverture diagnostique (0-1)
    SFF             float|None  — fraction de défaillance sûre (0-1)
    beta            float|None  — facteur CCF (PDS Table 3.12)
    RHF             float|None  — fraction de défaillances aléatoires hardware (Table 3.14)
    section         str     — section de référence dans le handbook
    notes           str     — conditions particulières / footnotes
    source          str     — "PDS2021"

Changelog :
    v0.7.6 (2026-03-15) — Sprint G : vérification p118-148 (rapport 15)
                          20 corrections β/λ_DU_70/IC sur entrées existantes
                          7 CI_PATCH corrigés (PSV, deluge, FW monitor, sprinkler, FW pumps)
                          13 nouvelles entrées : PSV×4, water_mist×2, fw_pump_components×7
                          Total : 143 → 156 équipements
    v0.7.5 (2026-03-14) — Sprint G : vérification p87-117 (rapport 14)
                          Corrections : pss_*/hardwired_logic/fire_central/galvanic_barrier λ_DU_70+IC
                          galvanic_barrier β None→0.05
                          topside_esv_xv λ_DU_70 2.6→2.4 + IC (1.9,2.8)→(2.1,2.6)
                          topside_esv_xv_ball/gate IC manquants ajoutés
                          topside_xt_pmv_pwv β 0.08→0.05, λ_DU_70+IC invalides retirés
                          topside_xt_glesdv λ_crit 0.5→0.2
                          blowdown_valve λ_DU_70 3.2→None, IC lo 2.1→2.5
                          23 nouvelles entrées : ESV/XV taille×4 + butterfly, service/medium×12, PMV/PWV×6
    v0.7.4 (2026-03-14) — Sprint G : intégration complète sous-types p56-86 (rapport 13b)
                          13 nouvelles entrées : flow_transmitter ×2, line_gas_detector ×2,
                          smoke_detector ×3, heat_detector ×2, manual_pushbutton ×4
                          Total : 107 → 120 équipements
    v0.7.3 (2026-03-14) — Sprint G : pages 56-86 PDS 2021 vérifiées (rapports 12 + 13)
                          Corrections rapport 12 (p56-70) :
                            ir_point_gas_detector: lambda_DU 0.25→0.30, SFF 0.92→0.91
                            line_gas_detector: lambda_DU 0.44→0.40
                          Corrections rapport 13 (p71-86) :
                            smoke_detector: _CI_PATCH hi 0.32→0.18 (mélange sous-populations)
                            manual_pushbutton_outdoor: lambda_DU_70 0.53→0.20 (valeur Pneumatic ESD)
                            manual_pushbutton_outdoor: _CI_PATCH (0.05,0.70)→(0.14,0.23)
    v0.7.1 (2026-03-12) — Sprint G : pages 25-55 PDS 2021
                          Ajout champs RHF (Table 3.14) et IC 90% (Tables 3.15–3.18)
                          Corrections λ_DU : ir_point_gas 0.30→0.25, line_gas 0.40→0.44,
                          pa_loudspeakers 0.20→0.23 ; λ_DU_70 : circuit_breaker, water_mist,
                          process_control_valve_shutdown
                          Nouveaux sous-types : level_transmitter ×4 (principe de mesure),
                          DHSV ×4 (topside/subsea wells), pressure_transmitter_piezoresistive
    v0.7.0 (2026-03-12) — Sprint G : création initiale, pages 4-24 PDS 2021
                          Tables 3.1–3.12 intégrées (topside + subsea + downhole + forage)
"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional, List, Dict


# ─────────────────────────────────────────────────────────────────
# Dataclass
# ─────────────────────────────────────────────────────────────────

@dataclass
class PDSEntry:
    key: str
    description: str
    category: str
    lambda_DU: float                    # [1/h] — paramètre principal
    DC: float                           # (0-1)
    lambda_crit: Optional[float] = None # [1/h]
    lambda_S: Optional[float] = None    # [1/h]
    lambda_D: Optional[float] = None    # [1/h]
    lambda_DU_70: Optional[float] = None    # [1/h]
    lambda_DU_90_lo: Optional[float] = None # [1/h] — borne basse IC 90%
    lambda_DU_90_hi: Optional[float] = None # [1/h] — borne haute IC 90%
    SFF: Optional[float] = None             # (0-1)
    beta: Optional[float] = None            # CCF factor
    RHF: Optional[float] = None             # Random Hardware Failure Fraction (Table 3.14)
    section: str = ""
    notes: str = ""
    source: str = "PDS2021"

    @property
    def lambda_DD(self) -> float:
        """lambda_DD = lambda_D - lambda_DU  (ou DC * lambda_D si lambda_D connu)"""
        if self.lambda_D is not None:
            return max(0.0, self.lambda_D - self.lambda_DU)
        return self.DC * self.lambda_DU / max(1e-9, 1.0 - self.DC) if self.DC < 1.0 else 0.0


# ─────────────────────────────────────────────────────────────────
# Facteurs C_MooN (Table 2.2 PDS 2021 = Table D.5 IEC 61508-6)
# ─────────────────────────────────────────────────────────────────
# Clé : (M, N)  — β_MooN = β × C_MooN

C_MOON: Dict[tuple, float] = {
    (1, 2): 1.0,  (1, 3): 0.5,  (1, 4): 0.3,  (1, 5): 0.2,  (1, 6): 0.15,
    (2, 3): 2.0,  (2, 4): 1.1,  (2, 5): 0.8,  (2, 6): 0.6,
    (3, 4): 2.8,  (3, 5): 1.6,  (3, 6): 1.2,
    (4, 5): 3.6,  (4, 6): 1.9,
    (5, 6): 4.5,
}


def beta_moon(beta: float, M: int, N: int) -> float:
    """β_MooN = β × C_MooN  (PDS §2.4.1)"""
    if M == N:
        return beta  # 1oo1 : C = 1 par convention
    c = C_MOON.get((M, N))
    if c is None:
        raise ValueError(f"C_MooN non défini pour M={M}, N={N}")
    return beta * c


# ─────────────────────────────────────────────────────────────────
# Helper de conversion
# ─────────────────────────────────────────────────────────────────

def _e6(val) -> Optional[float]:
    """Convertit une valeur PDS [10⁻⁶/h] → [1/h]. None si None ou '-'."""
    if val is None:
        return None
    return val * 1e-6


# ─────────────────────────────────────────────────────────────────
# BASE DE DONNÉES
# ─────────────────────────────────────────────────────────────────

_RAW: List[dict] = [

    # ══════════════════════════════════════════════════════════════
    # TABLE 3.1 — TRANSMETTEURS ET SWITCHES TOPSIDE
    # ══════════════════════════════════════════════════════════════
    {
        "key": "position_switch",
        "description": "Position switch (proximity or limit)",
        "category": "topside_input",
        "lambda_crit": 1.9, "lambda_S": 0.7, "lambda_D": 1.2,
        "lambda_DU": 1.1, "lambda_DU_70": 1.3,
        "DC": 0.05, "SFF": 0.41, "beta": 0.10,
        "section": "4.2.1", "notes": "",
    },
    {
        "key": "aspirator_system_flow_switch",
        "description": "Aspirator system including flow switch (excl. detector)",
        "category": "topside_input",
        "lambda_crit": 4.6, "lambda_S": 1.9, "lambda_D": 2.6,
        "lambda_DU": 2.5, "lambda_DU_70": 3.0,
        "DC": 0.05, "SFF": 0.46, "beta": 0.10,
        "section": "4.2.2", "notes": "",
    },
    {
        "key": "pressure_transmitter",
        "description": "Pressure transmitter (topside)",
        "category": "topside_input",
        "lambda_crit": 1.95, "lambda_S": 0.58, "lambda_D": 1.36,
        "lambda_DU": 0.48, "lambda_DU_70": 0.52,
        "DC": 0.65, "SFF": 0.75, "beta": 0.10,
        "section": "4.2.3", "notes": "Détails par principe de mesure en §4.2.3 (D)",
    },
    {
        "key": "level_transmitter",
        "description": "Level transmitter (topside)",
        "category": "topside_input",
        "lambda_crit": 10.0, "lambda_S": 4.2, "lambda_D": 6.3,
        "lambda_DU": 1.9, "lambda_DU_70": 2.5,
        "DC": 0.70, "SFF": 0.82, "beta": 0.10,
        "section": "4.2.4",
        "notes": "λ_DU varie significativement avec la complexité de l'application — voir §4.2.4",
    },
    {
        "key": "temperature_transmitter",
        "description": "Temperature transmitter (topside)",
        "category": "topside_input",
        "lambda_crit": 0.7, "lambda_S": 0.3, "lambda_D": 0.4,
        "lambda_DU": 0.1, "lambda_DU_70": 0.2,
        "DC": 0.70, "SFF": 0.82, "beta": 0.10,
        "section": "4.2.5", "notes": "",
    },
    {
        "key": "flow_transmitter",
        "description": "Flow transmitter (topside)",
        "category": "topside_input",
        "lambda_crit": 6.6, "lambda_S": 2.7, "lambda_D": 4.0,
        "lambda_DU": 1.4, "lambda_DU_70": 1.8,
        "DC": 0.65, "SFF": 0.79, "beta": 0.10,
        "section": "4.2.6", "notes": "",
    },

    # ══════════════════════════════════════════════════════════════
    # TABLE 3.2 — DÉTECTEURS TOPSIDE
    # ══════════════════════════════════════════════════════════════
    {
        "key": "catalytic_point_gas_detector",
        "description": "Catalytic point gas detector",
        "category": "topside_detector",
        "lambda_crit": 5.2, "lambda_S": 1.6, "lambda_D": 3.6,
        "lambda_DU": 1.5, "lambda_DU_70": 1.6,
        "DC": 0.60, "SFF": 0.72, "beta": 0.10,
        "section": "4.2.7", "notes": "",
    },
    {
        "key": "ir_point_gas_detector",
        "description": "IR point gas detector",
        "category": "topside_detector",
        "lambda_crit": 3.2, "lambda_S": 1.5, "lambda_D": 1.7,
        "lambda_DU": 0.30, "lambda_DU_70": 0.27,
        "lambda_DU_90_lo": 0.21, "lambda_DU_90_hi": 0.30,
        "DC": 0.85, "SFF": 0.91, "beta": 0.10,
        "RHF": 0.40,
        "section": "4.2.8",
        "notes": "SINTEF Best Estimate=0.30 (95e centile opérationnel). Moyenne opérat.=0.25. "
                 "DC augmenté 75%→85% vs 2013. SFF=2.9/3.2=0.91. Rapport 12 §4.2.8 p61.",
    },
    {
        "key": "aspirated_ir_point_gas_detector",
        "description": "Aspirated IR point gas detector system",
        "category": "topside_detector",
        "lambda_crit": 6.6, "lambda_S": 3.1, "lambda_D": 3.5,
        "lambda_DU": 2.9, "lambda_DU_70": 3.6,
        "DC": 0.16, "SFF": 0.56, "beta": 0.10,
        "section": "4.2.9", "notes": "DC faible — système aspiré avec contraintes opérationnelles",
    },
    {
        "key": "line_gas_detector",
        "description": "Line gas detector",
        "category": "topside_detector",
        "lambda_crit": 6.7, "lambda_S": 2.3, "lambda_D": 4.4,
        "lambda_DU": 0.40, "lambda_DU_70": 0.47,
        "lambda_DU_90_lo": 0.36, "lambda_DU_90_hi": 0.53,
        "DC": 0.90, "SFF": 0.94, "beta": 0.10,
        "RHF": 0.40,
        "section": "4.2.10",
        "notes": "SINTEF Best Estimate=0.40 (arrondi conservatif). Moyenne opérat.=0.44. "
                 "Cohérence SFF=6.30/6.7=0.94 confirme λ_DU=0.40. Rapport 12 §4.2.10 p66.",
    },
    {
        "key": "electrochemical_detector",
        "description": "Electrochemical detector",
        "category": "topside_detector",
        "lambda_crit": 6.0, "lambda_S": 1.8, "lambda_D": 4.2,
        "lambda_DU": 1.7, "lambda_DU_70": 1.9,
        "DC": 0.60, "SFF": 0.68, "beta": 0.10,
        "section": "4.2.11", "notes": "",
    },
    {
        "key": "smoke_detector",
        "description": "Smoke detector",
        "category": "topside_detector",
        "lambda_crit": 2.0, "lambda_S": 1.2, "lambda_D": 0.8,
        "lambda_DU": 0.16, "lambda_DU_70": 0.17,
        "DC": 0.80, "SFF": 0.92, "beta": 0.10,
        "section": "4.2.12", "notes": "",
    },
    {
        "key": "heat_detector",
        "description": "Heat detector",
        "category": "topside_detector",
        "lambda_crit": 2.29, "lambda_S": 1.37, "lambda_D": 0.92,
        "lambda_DU": 0.37, "lambda_DU_70": 0.43,
        "DC": 0.60, "SFF": 0.84, "beta": 0.10,
        "section": "4.2.13", "notes": "",
    },
    {
        "key": "flame_detector",
        "description": "Flame detector",
        "category": "topside_detector",
        "lambda_crit": 3.53, "lambda_S": 2.12, "lambda_D": 1.41,
        "lambda_DU": 0.35, "lambda_DU_70": 0.37,
        "DC": 0.75, "SFF": 0.90, "beta": 0.10,
        "section": "4.2.14", "notes": "",
    },

    # ══════════════════════════════════════════════════════════════
    # TABLE 3.3 — BOUTONS / CALL POINTS
    # ══════════════════════════════════════════════════════════════
    {
        "key": "manual_pushbutton_outdoor",
        "description": "Manual pushbutton / call point (outdoor)",
        "category": "topside_input",
        "lambda_crit": 0.35, "lambda_S": 0.11, "lambda_D": 0.23,
        "lambda_DU": 0.19, "lambda_DU_70": 0.20,
        "DC": 0.20, "SFF": 0.46, "beta": 0.05,
        "section": "4.2.15",
        "notes": "λ_DU_70=0.20 : valeur all data (corrigé — 0.53 était Pneumatic ESD sub-type). "
                 "IC=[0.14,0.23] : all data (corrigé — (0.05,0.70) était mélange sous-popul.). "
                 "SFF obs. DB=0.46 vs calc IEC=(0.11+0.04)/0.35=0.43 — à vérifier Table 3.3.",
    },
    {
        "key": "cap_switch_indoor",
        "description": "CAP switch (indoor)",
        "category": "topside_input",
        "lambda_crit": 0.21, "lambda_S": 0.07, "lambda_D": 0.14,
        "lambda_DU": 0.11, "lambda_DU_70": 0.20,
        "DC": 0.20, "SFF": 0.46, "beta": 0.05,
        "section": "4.2.16",
        "notes": "SFF obs. DB=0.46 vs calc IEC=(0.07+0.03)/0.21=0.48 — à vérifier Table 3.3.",
    },

    # ══════════════════════════════════════════════════════════════
    # TABLE 3.4 — UNITÉS DE LOGIQUE (TOPSIDE)
    # ══════════════════════════════════════════════════════════════

    # --- PLC Standard industriel ---
    {
        "key": "std_plc_analog_input",
        "description": "Standard industrial PLC — Analogue input (single channel)",
        "category": "control_logic",
        "lambda_crit": 3.6, "lambda_S": 1.8, "lambda_D": 1.8,
        "lambda_DU": 0.7, "lambda_DU_70": None,
        "DC": 0.60, "SFF": 0.80, "beta": 0.07,
        "section": "4.3.1.1",
        "notes": "λ_DU_70% non disponible pour les unités logiques topside",
    },
    {
        "key": "std_plc_cpu",
        "description": "Standard industrial PLC — CPU / logic solver (1oo1)",
        "category": "control_logic",
        "lambda_crit": 17.5, "lambda_S": 8.8, "lambda_D": 8.8,
        "lambda_DU": 3.5, "lambda_DU_70": None,
        "DC": 0.60, "SFF": 0.80, "beta": 0.07,
        "section": "4.3.1.2", "notes": "λ_DU_70% non disponible",
    },
    {
        "key": "std_plc_digital_output",
        "description": "Standard industrial PLC — Digital output (single channel)",
        "category": "control_logic",
        "lambda_crit": 3.6, "lambda_S": 1.8, "lambda_D": 1.8,
        "lambda_DU": 0.7, "lambda_DU_70": None,
        "DC": 0.60, "SFF": 0.80, "beta": 0.07,
        "section": "4.3.1.3", "notes": "λ_DU_70% non disponible",
    },

    # --- PSS Programmable Safety System ---
    {
        "key": "pss_analog_input",
        "description": "Programmable safety system (PSS) — Analogue input (single channel)",
        "category": "control_logic",
        "lambda_crit": 2.8, "lambda_S": 1.4, "lambda_D": 1.4,
        "lambda_DU": 0.1, "lambda_DU_70": 1.3,
        "DC": 0.90, "SFF": 0.95, "beta": 0.05,
        "section": "4.3.2.1",
        "notes": "λ_DU_70=1.3, IC 0-90%=[0, 2.5] : 0 DU sur 17 tags / 9.2×10⁵h / 2 inst. Valeur Best Estimate réduite vs PDS 2013 (technologie + données nulles). Source : §4.3.2.1 p91.",
    },
    {
        "key": "pss_cpu",
        "description": "Programmable safety system (PSS) — CPU / logic solver (1oo1)",
        "category": "control_logic",
        "lambda_crit": 5.4, "lambda_S": 2.7, "lambda_D": 2.7,
        "lambda_DU": 0.3, "lambda_DU_70": 1.5,
        "DC": 0.90, "SFF": 0.95, "beta": 0.05,
        "section": "4.3.2.2",
        "notes": "λ_DU_70=1.5, IC 0-90%=[0, 2.9] : 0 DU sur 41 tags / 1.7×10⁶h / 2 inst. Source : §4.3.2.2 p92.",
    },
    {
        "key": "pss_digital_output",
        "description": "Programmable safety system (PSS) — Digital output (single channel)",
        "category": "control_logic",
        "lambda_crit": 3.20, "lambda_S": 1.60, "lambda_D": 1.60,
        "lambda_DU": 0.16, "lambda_DU_70": 0.67,
        "DC": 0.90, "SFF": 0.95, "beta": 0.05,
        "section": "4.3.2.3",
        "notes": "λ_DU_70=0.67, IC 5-95%=[0.01, 1.31] : 1 DU sur 59 tags / 3.6×10⁶h / 2 inst. Taux brut λ_DU_obs=0.28 — même valeur Best Estimate que 2013 (1 DU observé). Source : §4.3.2.3 p93.",
    },

    # --- Hardwired Safety System ---
    {
        "key": "hardwired_analog_input",
        "description": "Hardwired safety system — Analogue input / trip amplifier (single)",
        "category": "control_logic",
        "lambda_crit": 0.44, "lambda_S": 0.40, "lambda_D": 0.04,
        "lambda_DU": 0.04, "lambda_DU_70": None,
        "DC": 0.00, "SFF": 0.91, "beta": 0.03,
        "section": "4.3.3.1",
        "notes": "DC=0 : hypothèse que toute défaillance DD conduit à un trip (défaillance sûre)",
    },
    {
        "key": "hardwired_logic",
        "description": "Hardwired safety system — Logic (1oo1)",
        "category": "control_logic",
        "lambda_crit": 0.33, "lambda_S": 0.30, "lambda_D": 0.03,
        "lambda_DU": 0.03, "lambda_DU_70": 9.8,
        "DC": 0.00, "SFF": 0.91, "beta": 0.03,
        "section": "4.3.3.2",
        "notes": "⚠ λ_DU_70=9.8 et IC 0-90%=[0, 19] : population EXTRÊMEMENT réduite (2 tags, 1 inst., 0 DU obs). "
                 "IC représente une incertitude statistique maximale — valeur Best Estimate 0.03 basée sur jugement expert. "
                 "Source : §4.3.3.2 p95.",
    },
    {
        "key": "hardwired_digital_output",
        "description": "Hardwired safety system — Digital output (single)",
        "category": "control_logic",
        "lambda_crit": 0.44, "lambda_S": 0.40, "lambda_D": 0.04,
        "lambda_DU": 0.04, "lambda_DU_70": None,
        "DC": 0.00, "SFF": 0.91, "beta": 0.03,
        "section": "4.3.3.3", "notes": "DC=0 par hypothèse — voir §4.3.3",
    },

    # --- Autres unités logiques ---
    {
        "key": "fire_central",
        "description": "Fire central including I/O",
        "category": "control_logic",
        "lambda_crit": 13.2, "lambda_S": 6.6, "lambda_D": 6.6,
        "lambda_DU": 0.7, "lambda_DU_70": 1.6,
        "DC": 0.90, "SFF": 0.95, "beta": 0.05,
        "section": "4.3.4.1",
        "notes": "Nouvel équipement PDS 2021 (absent de 2013). λ_DU_70=1.6, IC 5-95%=[0.03, 3.1] : 1 DU sur 17 tags / 1.5×10⁶h / 2 inst. Valeur a priori bayésienne (PSS CPU+I/O). Source : §4.3.4.1 p97.",
    },
    {
        "key": "galvanic_barrier",
        "description": "Intrinsic safety isolator (galvanic isolation / galvanic barrier)",
        "category": "control_logic",
        "lambda_crit": 0.2, "lambda_S": 0.1, "lambda_D": 0.1,
        "lambda_DU": 0.1, "lambda_DU_70": 2.5,
        "DC": 0.00, "SFF": 0.50, "beta": 0.05,
        "section": "4.3.4.2",
        "notes": "β=0.05 (corrigé — valeur manquante). λ_DU_70=2.5, IC 0-90%=[0, 4.7] : 0 DU sur 8 tags / 4.9×10⁵h / 1 inst. "
                 "Prior bayésien Exida 2015 (Stahl 9160). Source : §4.3.4.2 p98.",
    },

    # ══════════════════════════════════════════════════════════════
    # TABLE 3.5 — VANNES TOPSIDE
    # ══════════════════════════════════════════════════════════════
    {
        "key": "topside_esv_xv",
        "description": "Topside ESV and XV — generic (excl. solenoid/pilot)",
        "category": "topside_valve",
        "lambda_crit": 4.5, "lambda_S": 2.0, "lambda_D": 2.5,
        "lambda_DU": 2.3, "lambda_DU_70": 2.4,
        "DC": 0.05, "SFF": 0.48, "beta": 0.08,
        "section": "4.4.1",
        "notes": "λ_DU_70=2.4 + IC=[2.1,2.6] : all data 248 DU obs / 1846 pop. Taux ESD+PSD identiques. "
                 "Modes dflt : FTC 45%, DOP 40%, LCP 15%. Voir sous-types par taille/service/design. "
                 "λ_DU=2.0 si XV sans critère étanchéité (LCP exclus). Source : §4.4.1 p99.",
    },
    {
        "key": "topside_esv_xv_ball",
        "description": "Topside ESV and XV — ball valves (excl. solenoid/pilot)",
        "category": "topside_valve",
        "lambda_crit": 4.0, "lambda_S": 1.8, "lambda_D": 2.2,
        "lambda_DU": 2.1, "lambda_DU_70": 2.2,
        "DC": 0.05, "SFF": 0.48, "beta": 0.08,
        "section": "4.4.1.1", "notes": "",
    },
    {
        "key": "topside_esv_xv_gate",
        "description": "Topside ESV and XV — gate valves (excl. solenoid/pilot)",
        "category": "topside_valve",
        "lambda_crit": 6.4, "lambda_S": 2.9, "lambda_D": 3.5,
        "lambda_DU": 3.3, "lambda_DU_70": 3.6,
        "DC": 0.05, "SFF": 0.48, "beta": 0.08,
        "section": "4.4.1.2", "notes": "",
    },
    {
        "key": "riser_esv",
        "description": "Riser ESV (excl. solenoid/pilot)",
        "category": "topside_valve",
        "lambda_crit": 3.6, "lambda_S": 1.6, "lambda_D": 2.0,
        "lambda_DU": 1.9, "lambda_DU_70": 2.6,
        "DC": 0.05, "SFF": 0.48, "beta": 0.08,
        "section": "4.4.2", "notes": "",
    },
    {
        "key": "topside_xt_pmv_pwv",
        "description": "Topside XT valve — PMV and PWV (excl. solenoid/pilot)",
        "category": "topside_valve",
        "lambda_crit": 4.5, "lambda_S": 2.0, "lambda_D": 2.5,
        "lambda_DU": 2.3, "lambda_DU_70": None,
        "DC": 0.05, "SFF": 0.48, "beta": 0.05,
        "section": "4.4.3",
        "notes": "β=0.05 (valves XT wellhead, distinct des ESV/XV β=0.08). "
                 "λ_DU Best Estimate = 50% Wellmaster (λ=1.4) + 50% RNNP (λ=3.3×1.6=2.3). "
                 "Aucun λ_DU_70% ni IC explicite pour le Best Estimate combiné — voir sous-types PMV/PWV. "
                 "Source : §4.4.3 p109-110.",
    },
    {
        "key": "topside_xt_hascv",
        "description": "Topside XT valve — HASCV (hydraulically actuated safety check valve)",
        "category": "topside_valve",
        "lambda_crit": 5.2, "lambda_S": 0.7, "lambda_D": 4.5,
        "lambda_DU": 4.2, "lambda_DU_70": 5.2,
        "DC": 0.05, "SFF": 0.48, "beta": 0.08,
        "section": "4.4.4", "notes": "SFF assumé identique à PMV/PWV (note ²)",
    },
    {
        "key": "topside_xt_glesdv",
        "description": "Topside XT valve — GLESDV, gas lift ESD valve (excl. solenoid/pilot)",
        "category": "topside_valve",
        "lambda_crit": 0.2, "lambda_S": 0.0, "lambda_D": 0.2,
        "lambda_DU": 0.2, "lambda_DU_70": 0.5,
        "DC": 0.05, "SFF": 0.48, "beta": 0.08,
        "section": "4.4.5",
        "notes": "λ_crit=0.2 (=λ_D+λ_S=0.2+0). 1 DU obs / 93 tags / 18 inst. / 5 op. Mode FTC uniquement observé. Source : §4.4.5 p112.",
    },
    {
        "key": "topside_xt_ciesdv",
        "description": "Topside XT valve — CIESDV, chemical injection ESD valve (incl. solenoid/pilot)",
        "category": "topside_valve",
        "lambda_crit": 1.9, "lambda_S": 0.0, "lambda_D": 1.9,
        "lambda_DU": 1.8, "lambda_DU_70": 3.2,
        "DC": 0.05, "SFF": 0.48, "beta": 0.08,
        "section": "4.4.6", "notes": "Inclut solénoïde/pilote. SFF assumé identique à PMV/PWV (note ²)",
    },
    {
        "key": "topside_hipps_valve",
        "description": "Topside HIPPS valve (excl. solenoid/pilot)",
        "category": "topside_valve",
        "lambda_crit": 1.2, "lambda_S": 0.7, "lambda_D": 0.5,
        "lambda_DU": 0.5, "lambda_DU_70": 0.9,
        "DC": 0.05, "SFF": 0.57, "beta": 0.08,
        "section": "4.4.7", "notes": "",
    },
    {
        "key": "blowdown_valve",
        "description": "Blowdown valve (excl. solenoid/pilot)",
        "category": "topside_valve",
        "lambda_crit": 5.3, "lambda_S": 2.2, "lambda_D": 3.1,
        "lambda_DU": 2.8, "lambda_DU_70": None,
        "DC": 0.05, "SFF": 0.48, "beta": 0.08,
        "section": "4.4.8",
        "notes": "Best Estimate = 50% oper. reviews (λ=3.2) + 50% RNNP (λ=2.3). "
                 "Aucun λ_DU_70% explicite pour cette valeur combinée. "
                 "IC=[2.5, 4.1] issu des données oper. review uniquement. "
                 "Modes dflt : FTO 50%, DOP 50%. Source : §4.4.8 p116.",
    },
    {
        "key": "fast_opening_valve_fov",
        "description": "Fast opening valve — FOV (in closed flare, excl. solenoid/pilot)",
        "category": "topside_valve",
        "lambda_crit": 11.0, "lambda_S": 4.1, "lambda_D": 6.6,
        "lambda_DU": 6.3, "lambda_DU_70": 7.6,
        "DC": 0.05, "SFF": 0.41, "beta": 0.08,
        "section": "4.4.9", "notes": "",
    },
    {
        "key": "solenoid_pilot_valve",
        "description": "Solenoid or pilot valve (single)",
        "category": "topside_valve",
        "lambda_crit": 0.8, "lambda_S": 0.48, "lambda_D": 0.32,
        "lambda_DU": 0.3, "lambda_DU_70": 0.34,
        "DC": 0.05, "SFF": 0.62, "beta": 0.05,
        "section": "4.4.10",
        "notes": "β=0.05 (corrigé — 0.10 était valeur défaut ESV/XV). "
                 "λ_D=0.32, λ_S=0.48. Pour config solénoïde+pilote : λ_DU=0.6×10⁻⁶ (2 vannes). "
                 "37 DU / 2020 tags / 1.1×10⁸h / 4 inst. / 3 op. Source : §4.4.10 p120.",
    },
    {
        "key": "process_control_valve_frequent",
        "description": "Process control valve — frequently operated (excl. solenoid/pilot)",
        "category": "topside_valve",
        "lambda_crit": 6.3, "lambda_S": 2.7, "lambda_D": 3.6,
        "lambda_DU": 2.5, "lambda_DU_70": None,
        "DC": 0.30, "SFF": 0.60, "beta": 0.05,
        "section": "4.4.11",
        "notes": "β=0.05 (corrigé — PCV). λ_DU_70=None (données OREDA sans décomposition IC). "
                 "Vanne en service contrôle+arrêt. Ajouter solénoïde/pilote séparément. Source : §4.4.11 p121.",
    },
    {
        "key": "process_control_valve_shutdown",
        "description": "Process control valve — shutdown service only (excl. solenoid/pilot)",
        "category": "topside_valve",
        "lambda_crit": None, "lambda_S": None, "lambda_D": None,
        "lambda_DU": 3.5, "lambda_DU_70": None,
        "DC": 0.05, "SFF": 0.60, "beta": 0.05,
        "section": "4.4.11",
        "notes": "β=0.05 (corrigé). λ_DU_70=None (données OREDA sans décomposition IC). "
                 "Usage arrêt seul — DC=5% (faible actionnement). Source : §4.4.11 p121.",
    },
    {
        "key": "pressure_relief_valve_psv",
        "description": "Pressure relief valve — PSV",
        "category": "topside_valve",
        "lambda_crit": 2.8, "lambda_S": 0.9, "lambda_D": 1.9,
        "lambda_DU": 1.9, "lambda_DU_70": None,
        "DC": 0.00, "SFF": 0.33, "beta": 0.07,
        "section": "4.4.12",
        "notes": "Best Estimate = 75% oper. reviews (λ=1.37) + 25% RNNP (λ=3.3). "
                 "λ_DU_70=None (aucune IC documentée pour BE combiné). "
                 "IC=[1.2,1.6] = données oper. review uniquement. "
                 "Note : λ_DU=1.0 suggéré pour test à 110% setpoint (50% du taux). "
                 "Facteurs service : clean ×0.4=1.1, moderate=1.9, dirty ×2=3.8 (API 521). "
                 "Source : §4.4.12 p122-123.",
    },
    {
        "key": "deluge_valve",
        "description": "Deluge valve (incl. solenoid and pilot)",
        "category": "topside_valve",
        "lambda_crit": 2.2, "lambda_S": 0.8, "lambda_D": 1.4,
        "lambda_DU": 1.4, "lambda_DU_70": None,
        "DC": 0.00, "SFF": 0.37, "beta": 0.08,
        "section": "4.4.13",
        "notes": "Best Estimate = 50% oper. (λ=0.7) + 50% RNNP (λ=2.1). "
                 "λ_DU_70=None (aucune IC pour BE combiné). "
                 "IC=[0.4,1.1] = données oper. review uniquement. Inclut solénoïde et pilote. "
                 "Source : §4.4.13 p124-125.",
    },
    {
        "key": "fire_water_monitor_valve",
        "description": "Fire water monitor valve (incl. solenoid/pilot)",
        "category": "topside_valve",
        "lambda_crit": 3.6, "lambda_S": 1.3, "lambda_D": 2.2,
        "lambda_DU": 2.2, "lambda_DU_70": None,
        "DC": 0.00, "SFF": 0.37, "beta": 0.08,
        "section": "4.4.14",
        "notes": "Best Estimate = Bayes (prior=deluge_valve, oper: λ=2.6, 4 DU). "
                 "λ_DU_70=None (aucune IC pour BE bayésien). "
                 "IC=[0.9,6.0] = données oper. review uniquement. Inclut solénoïde/pilote. "
                 "Données limitées (35 tags, 4 inst., 1 op.). Source : §4.4.14 p126.",
    },
    {
        "key": "water_mist_valve",
        "description": "Water mist valve (incl. solenoid/pilot)",
        "category": "topside_valve",
        "lambda_crit": 1.2, "lambda_S": 0.5, "lambda_D": 0.8,
        "lambda_DU": 0.8, "lambda_DU_70": 1.1,
        "DC": 0.00, "SFF": 0.37, "beta": 0.08,
        "section": "4.4.16", "notes": "",
    },
    {
        "key": "sprinkler_valve",
        "description": "Sprinkler valve (incl. solenoid/pilot)",
        "category": "topside_valve",
        "lambda_crit": 2.1, "lambda_S": 0.8, "lambda_D": 1.3,
        "lambda_DU": 1.3, "lambda_DU_70": 4.9,
        "DC": 0.00, "SFF": 0.38, "beta": 0.08,
        "section": "4.4.17",
        "notes": "Borne supérieure 70% élevée — forte incertitude sur les données",
    },
    {
        "key": "foam_valve",
        "description": "Foam valve (incl. solenoid/pilot)",
        "category": "topside_valve",
        "lambda_crit": 6.5, "lambda_S": 2.4, "lambda_D": 4.1,
        "lambda_DU": 4.1, "lambda_DU_70": 5.2,
        "DC": 0.00, "SFF": 0.37, "beta": 0.08,
        "section": "4.4.18", "notes": "",
    },
    {
        "key": "ballast_water_valve",
        "description": "Ballast water valve (excl. solenoid/pilot)",
        "category": "topside_valve",
        "lambda_crit": 1.0, "lambda_S": 0.4, "lambda_D": 0.6,
        "lambda_DU": 0.5, "lambda_DU_70": 0.7,
        "DC": 0.05, "SFF": 0.43, "beta": 0.05,
        "section": "4.4.19",
        "notes": "β=0.05 (corrigé — 0.08 était défaut). Exclut solénoïde/pilote. "
                 "FTO 60%, FTC 40%. 6 DU / 211 tags / 1.1×10⁷h / 6 inst. Source : §4.4.19 p132.",
    },

    # ══════════════════════════════════════════════════════════════
    # TABLE 3.6 — ÉLÉMENTS FINAUX DIVERS (TOPSIDE)
    # ══════════════════════════════════════════════════════════════
    {
        "key": "fire_water_monitor",
        "description": "Fire water monitor",
        "category": "topside_final",
        "lambda_crit": 1.5, "lambda_S": 0.0, "lambda_D": 1.5,
        "lambda_DU": 1.5, "lambda_DU_70": 3.6,
        "DC": 0.00, "SFF": 0.00, "beta": 0.08,
        "section": "4.4.15",
        "notes": "β=0.08 (corrigé — None précédemment). Données limitées (22 tags, 3 inst., 1 op.). "
                 "Source : §4.4.15 p127.",
    },
    {
        "key": "fire_water_pump_diesel_electric",
        "description": "Fire water pump system (complete) — diesel electric",
        "category": "topside_final",
        "lambda_crit": 28.0, "lambda_S": 2.8, "lambda_D": 25.0,
        "lambda_DU": 25.0, "lambda_DU_70": None,
        "DC": 0.00, "SFF": 0.10, "beta": 0.05,
        "section": "4.4.20",
        "notes": "β=0.05. λ_DU_70=None (aucune IC système documentée). "
                 "FTS 64%, UST 28%, LOO 8%. Données oper. review (bi-weekly testing). "
                 "PFD estimé ≈ 4×10⁻³. Voir composants fw_pump_component_*. Source : §4.4.20 p133.",
    },
    {
        "key": "fire_water_pump_diesel_hydraulic",
        "description": "Fire water pump system (complete) — diesel hydraulic",
        "category": "topside_final",
        "lambda_crit": 24.0, "lambda_S": 2.4, "lambda_D": 21.0,
        "lambda_DU": 21.0, "lambda_DU_70": None,
        "DC": 0.00, "SFF": 0.10, "beta": 0.05,
        "section": "4.4.21",
        "notes": "β=0.05. λ_DU_70=None. FTS 67%, UST 23%, LOO 10%. PFD ≈ 4×10⁻³. "
                 "Voir composants fw_pump_component_*. Source : §4.4.21 p137.",
    },
    {
        "key": "fire_water_pump_diesel_mechanical",
        "description": "Fire water pump system (complete) — diesel mechanical",
        "category": "topside_final",
        "lambda_crit": 16.0, "lambda_S": 1.6, "lambda_D": 14.0,
        "lambda_DU": 14.0, "lambda_DU_70": None,
        "DC": 0.00, "SFF": 0.10, "beta": 0.05,
        "section": "4.4.22",
        "notes": "β=0.05. λ_DU_70=None. FTS 63%, UST 25%, LOO 11%. PFD ≈ 2.5×10⁻³. "
                 "Voir composants fw_pump_component_*. Source : §4.4.22 p140.",
    },
    {
        "key": "fire_gas_damper",
        "description": "Fire & gas damper (incl. solenoid)",
        "category": "topside_final",
        "lambda_crit": 5.4, "lambda_S": 2.3, "lambda_D": 3.1,
        "lambda_DU": 3.1, "lambda_DU_70": 3.2,
        "DC": 0.00, "SFF": 0.42, "beta": 0.12,
        "section": "4.4.23", "notes": "",
    },
    {
        "key": "rupture_disc",
        "description": "Rupture disc",
        "category": "topside_final",
        "lambda_crit": 0.2, "lambda_S": 0.1, "lambda_D": 0.1,
        "lambda_DU": 0.1, "lambda_DU_70": 0.3,
        "DC": 0.00, "SFF": 0.50, "beta": 0.07,
        "section": "4.4.24",
        "notes": "β=0.07. λ_DU conservatif (0 DU sur 45 disques / 13 inst.). "
                 "Composant non testable — PFD de 10⁻³ suggéré par SINTEF. Source : §4.4.24 p144.",
    },
    {
        "key": "circuit_breaker",
        "description": "Circuit breaker",
        "category": "topside_final",
        "lambda_crit": 1.0, "lambda_S": 0.6, "lambda_D": 0.4,
        "lambda_DU": 0.4, "lambda_DU_70": 1.1,
        "lambda_DU_90_lo": 0.02, "lambda_DU_90_hi": 2.1,
        "DC": 0.00, "SFF": 0.60, "beta": 0.05,
        "RHF": 0.60,
        "section": "4.4.25", "notes": "Limited operational experience. Large CI reflects high uncertainty.",
    },
    {
        "key": "relay_contactor",
        "description": "Relay, contactor",
        "category": "topside_final",
        "lambda_crit": 0.2, "lambda_S": 0.1, "lambda_D": 0.1,
        "lambda_DU": 0.1, "lambda_DU_70": 0.2,
        "DC": 0.00, "SFF": 0.60, "beta": 0.05,
        "section": "4.4.26", "notes": "",
    },
    {
        "key": "fire_door",
        "description": "Fire door",
        "category": "topside_final",
        "lambda_crit": 4.6, "lambda_S": 1.9, "lambda_D": 2.7,
        "lambda_DU": 2.7, "lambda_DU_70": 2.8,
        "DC": 0.00, "SFF": 0.42, "beta": 0.05,
        "section": "4.4.27",
        "notes": "β=0.05. 107 DU / 808 tags / 4.0×10⁷h / 6 inst. Source : §4.4.27 p148.",
    },
    {
        "key": "watertight_door",
        "description": "Watertight door",
        "category": "topside_final",
        "lambda_crit": 5.1, "lambda_S": 2.1, "lambda_D": 3.0,
        "lambda_DU": 3.0, "lambda_DU_70": 3.5,
        "DC": 0.00, "SFF": 0.42, "beta": None,
        "section": "4.4.28", "notes": "",
    },
    {
        "key": "emergency_generator",
        "description": "Emergency generator",
        "category": "topside_final",
        "lambda_crit": 10.0, "lambda_S": 1.0, "lambda_D": 8.6,
        "lambda_DU": 8.6, "lambda_DU_70": 12.0,
        "DC": 0.00, "SFF": 0.10, "beta": None,
        "section": "4.4.29", "notes": "",
    },
    {
        "key": "lifeboat_engines",
        "description": "Lifeboat engines",
        "category": "topside_final",
        "lambda_crit": 12.0, "lambda_S": 1.2, "lambda_D": 11.0,
        "lambda_DU": 11.0, "lambda_DU_70": 14.0,
        "DC": 0.00, "SFF": 0.10, "beta": None,
        "section": "4.4.30", "notes": "",
    },
    {
        "key": "ups_battery_package",
        "description": "UPS and battery package",
        "category": "topside_final",
        "lambda_crit": 2.6, "lambda_S": 0.0, "lambda_D": 2.6,
        "lambda_DU": 0.5, "lambda_DU_70": 1.3,
        "DC": 0.80, "SFF": 0.80, "beta": None,
        "section": "4.4.31", "notes": "",
    },
    {
        "key": "emergency_lights",
        "description": "Emergency lights",
        "category": "topside_final",
        "lambda_crit": 3.7, "lambda_S": 0.0, "lambda_D": 3.7,
        "lambda_DU": 3.7, "lambda_DU_70": 3.9,
        "DC": 0.00, "SFF": 0.00, "beta": None,
        "section": "4.4.32", "notes": "",
    },
    {
        "key": "flashing_beacons",
        "description": "Flashing beacons",
        "category": "topside_final",
        "lambda_crit": 0.2, "lambda_S": 0.0, "lambda_D": 0.2,
        "lambda_DU": 0.2, "lambda_DU_70": 0.24,
        "DC": 0.00, "SFF": 0.00, "beta": None,
        "section": "4.4.33", "notes": "",
    },
    {
        "key": "lifeboat_radio",
        "description": "Lifeboat radio",
        "category": "topside_final",
        "lambda_crit": 12.0, "lambda_S": 0.0, "lambda_D": 12.0,
        "lambda_DU": 12.0, "lambda_DU_70": 15.0,
        "DC": 0.00, "SFF": 0.00, "beta": None,
        "section": "4.4.34", "notes": "",
    },
    {
        "key": "pa_loudspeakers",
        "description": "PA loudspeakers",
        "category": "topside_final",
        "lambda_crit": 0.2, "lambda_S": 0.0, "lambda_D": 0.2,
        "lambda_DU": 0.23, "lambda_DU_70": 0.25,
        "lambda_DU_90_lo": 0.20, "lambda_DU_90_hi": 0.30,
        "DC": 0.00, "SFF": 0.00, "beta": None,
        "RHF": None,
        "section": "4.4.35", "notes": "Large amount of data available. §3.8.2",
    },

    # ══════════════════════════════════════════════════════════════
    # TABLE 3.7 — ÉQUIPEMENTS D'ENTRÉE SUBSEA
    # ══════════════════════════════════════════════════════════════
    {
        "key": "subsea_pressure_sensor",
        "description": "Subsea pressure sensor",
        "category": "subsea_input",
        "lambda_crit": 2.0, "lambda_S": 0.8, "lambda_D": 1.2,
        "lambda_DU": 0.4, "lambda_DU_70": 0.8,
        "DC": 0.65, "SFF": 0.79, "beta": None,
        "section": "4.5.1",
        "notes": "β et DC indicatifs — voir §3.2. Utiliser valeurs topside comme point de départ.",
    },
    {
        "key": "subsea_temperature_sensor",
        "description": "Subsea temperature sensor",
        "category": "subsea_input",
        "lambda_crit": 1.0, "lambda_S": 0.4, "lambda_D": 0.6,
        "lambda_DU": 0.2, "lambda_DU_70": None,
        "DC": 0.65, "SFF": 0.79, "beta": None,
        "section": "4.5.2", "notes": "λ_DU_70% non disponible",
    },
    {
        "key": "subsea_pressure_temperature_sensor",
        "description": "Combined subsea pressure and temperature sensor",
        "category": "subsea_input",
        "lambda_crit": 2.2, "lambda_S": 0.9, "lambda_D": 1.3,
        "lambda_DU": 0.4, "lambda_DU_70": 0.8,
        "DC": 0.70, "SFF": 0.82, "beta": None,
        "section": "4.5.3", "notes": "",
    },
    {
        "key": "subsea_flow_sensor",
        "description": "Subsea flow sensor",
        "category": "subsea_input",
        "lambda_crit": 6.2, "lambda_S": 2.5, "lambda_D": 3.7,
        "lambda_DU": 1.3, "lambda_DU_70": 2.1,
        "DC": 0.65, "SFF": 0.79, "beta": None,
        "section": "4.5.4", "notes": "",
    },
    {
        "key": "subsea_sand_detector",
        "description": "Subsea sand detector",
        "category": "subsea_input",
        "lambda_crit": 9.5, "lambda_S": 3.8, "lambda_D": 5.7,
        "lambda_DU": 2.0, "lambda_DU_70": None,
        "DC": 0.65, "SFF": 0.79, "beta": None,
        "section": "4.5.5", "notes": "λ_DU_70% non disponible",
    },

    # ══════════════════════════════════════════════════════════════
    # TABLE 3.8 — LOGIQUE ET OMBILICAUX SUBSEA
    # ══════════════════════════════════════════════════════════════
    {
        "key": "subsea_mcs",
        "description": "MCS — Master control station (located topside)",
        "category": "subsea_logic",
        "lambda_crit": 15.0, "lambda_S": 7.7, "lambda_D": 7.7,
        "lambda_DU": 3.1, "lambda_DU_70": None,
        "DC": 0.60, "SFF": 0.80, "beta": None,
        "section": "4.5.6", "notes": "",
    },
    {
        "key": "umbilical_hydraulic_chemical",
        "description": "Umbilical hydraulic/chemical line (per line)",
        "category": "subsea_logic",
        "lambda_crit": 0.60, "lambda_S": 0.30, "lambda_D": 0.30,
        "lambda_DU": 0.06, "lambda_DU_70": None,
        "DC": 0.80, "SFF": 0.90, "beta": None,
        "section": "4.5.7", "notes": "Par ligne individuelle",
    },
    {
        "key": "umbilical_power_signal",
        "description": "Umbilical power/signal line (per line)",
        "category": "subsea_logic",
        "lambda_crit": 0.55, "lambda_S": 0.28, "lambda_D": 0.28,
        "lambda_DU": 0.06, "lambda_DU_70": None,
        "DC": 0.80, "SFF": 0.90, "beta": None,
        "section": "4.5.8", "notes": "Par ligne individuelle",
    },
    {
        "key": "subsea_sem",
        "description": "SEM — Subsea electronic module",
        "category": "subsea_logic",
        "lambda_crit": 5.3, "lambda_S": 2.6, "lambda_D": 2.6,
        "lambda_DU": 1.1, "lambda_DU_70": 1.5,
        "DC": 0.60, "SFF": 0.80, "beta": None,
        "section": "4.5.9", "notes": "",
    },
    {
        "key": "subsea_solenoid_control_valve",
        "description": "Subsea solenoid control valve (in subsea control module)",
        "category": "subsea_logic",
        "lambda_crit": 0.4, "lambda_S": 0.2, "lambda_D": 0.2,
        "lambda_DU": 0.2, "lambda_DU_70": None,
        "DC": 0.00, "SFF": 0.60, "beta": None,
        "section": "4.5.10", "notes": "λ_DU_70% non disponible",
    },

    # ══════════════════════════════════════════════════════════════
    # TABLE 3.9 — ÉLÉMENTS FINAUX SUBSEA
    # ══════════════════════════════════════════════════════════════
    {
        "key": "subsea_manifold_isolation_valve",
        "description": "Subsea manifold isolation valve",
        "category": "subsea_valve",
        "lambda_crit": 0.5, "lambda_S": 0.3, "lambda_D": 0.2,
        "lambda_DU": 0.2, "lambda_DU_70": None,
        "DC": 0.00, "SFF": None, "beta": None,
        "section": "4.5.11", "notes": "SFF indicatif uniquement pour éléments finaux subsea",
    },
    {
        "key": "subsea_xt_pmv_pwv",
        "description": "Subsea XT valve — PMV, PWV",
        "category": "subsea_valve",
        "lambda_crit": 0.9, "lambda_S": 0.3, "lambda_D": 0.6,
        "lambda_DU": 0.6, "lambda_DU_70": 0.7,
        "DC": 0.00, "SFF": None, "beta": None,
        "section": "4.5.12", "notes": "",
    },
    {
        "key": "subsea_xt_xov",
        "description": "Subsea XT valve — XOV (crossover valve)",
        "category": "subsea_valve",
        "lambda_crit": 0.13, "lambda_S": 0.05, "lambda_D": 0.08,
        "lambda_DU": 0.08, "lambda_DU_70": 0.14,
        "DC": 0.00, "SFF": None, "beta": None,
        "section": "4.5.13", "notes": "",
    },
    {
        "key": "subsea_xt_amv",
        "description": "Subsea XT valve — AMV (annulus master valve)",
        "category": "subsea_valve",
        "lambda_crit": 0.16, "lambda_S": 0.04, "lambda_D": 0.12,
        "lambda_DU": 0.12, "lambda_DU_70": 0.19,
        "DC": 0.00, "SFF": None, "beta": None,
        "section": "4.5.14", "notes": "",
    },
    {
        "key": "subsea_xt_civ_miv",
        "description": "Subsea XT valve — CIV, MIV (chemical/methanol injection valve)",
        "category": "subsea_valve",
        "lambda_crit": 0.30, "lambda_S": 0.06, "lambda_D": 0.24,
        "lambda_DU": 0.24, "lambda_DU_70": 0.4,
        "DC": 0.00, "SFF": None, "beta": None,
        "section": "4.5.15", "notes": "",
    },
    {
        "key": "subsea_ssiv",
        "description": "Subsea isolation valve — SSIV",
        "category": "subsea_valve",
        "lambda_crit": 0.9, "lambda_S": 0.5, "lambda_D": 0.4,
        "lambda_DU": 0.4, "lambda_DU_70": None,
        "DC": 0.00, "SFF": None, "beta": None,
        "section": "4.5.16", "notes": "λ_DU_70% non disponible",
    },

    # ══════════════════════════════════════════════════════════════
    # TABLE 3.10 — VANNES DOWNHOLE / WELL COMPLETION
    # ══════════════════════════════════════════════════════════════
    {
        "key": "dhsv_generic",
        "description": "Downhole safety valve (DHSV) — generic",
        "category": "downhole",
        "lambda_crit": 19.0, "lambda_S": 11.0, "lambda_D": 7.5,
        "lambda_DU": 7.5, "lambda_DU_70": None,
        "DC": 0.00, "SFF": None, "beta": None,
        "section": "4.6.1", "notes": "Catégorie générique — voir sous-types TRSCSSV et WRSCSSV",
    },
    {
        "key": "dhsv_trscssv",
        "description": "Downhole safety valve — TRSCSSV (tubing retrievable surface-controlled)",
        "category": "downhole",
        "lambda_crit": 4.4, "lambda_S": 0.4, "lambda_D": 4.0,
        "lambda_DU": 4.0, "lambda_DU_70": None,
        "DC": 0.00, "SFF": None, "beta": None,
        "section": "4.6.2", "notes": "",
    },
    {
        "key": "dhsv_wrscssv",
        "description": "Downhole safety valve — WRSCSSV (wireline retrievable surface-controlled)",
        "category": "downhole",
        "lambda_crit": 19.0, "lambda_S": 4.3, "lambda_D": 15.0,
        "lambda_DU": 15.0, "lambda_DU_70": None,
        "DC": 0.00, "SFF": None, "beta": None,
        "section": "4.6.3", "notes": "",
    },
    {
        "key": "trscassv_type_a",
        "description": "Annulus subsurface safety valve — TRSCASSV, type A",
        "category": "downhole",
        "lambda_crit": 4.3, "lambda_S": 0.6, "lambda_D": 3.6,
        "lambda_DU": 3.6, "lambda_DU_70": 3.9,
        "DC": 0.00, "SFF": None, "beta": None,
        "section": "4.6.4", "notes": "",
    },
    {
        "key": "trscassv_type_b",
        "description": "Annulus subsurface safety valve — TRSCASSV, type B",
        "category": "downhole",
        "lambda_crit": 4.7, "lambda_S": 0.8, "lambda_D": 3.9,
        "lambda_DU": 3.9, "lambda_DU_70": 4.4,
        "DC": 0.00, "SFF": None, "beta": None,
        "section": "4.6.5", "notes": "",
    },
    {
        "key": "wrciv",
        "description": "Wire retrievable chemical injection valve — WRCIV",
        "category": "downhole",
        "lambda_crit": 1.8, "lambda_S": 0.1, "lambda_D": 1.8,
        "lambda_DU": 1.8, "lambda_DU_70": 2.1,
        "DC": 0.00, "SFF": None, "beta": None,
        "section": "4.6.6", "notes": "",
    },
    {
        "key": "trciv",
        "description": "Tubing retrievable chemical injection valve — TRCIV",
        "category": "downhole",
        "lambda_crit": 0.4, "lambda_S": 0.1, "lambda_D": 0.3,
        "lambda_DU": 0.3, "lambda_DU_70": 0.7,
        "DC": 0.00, "SFF": None, "beta": None,
        "section": "4.6.7", "notes": "",
    },
    {
        "key": "gas_lift_valve_glv",
        "description": "Gas lift valve — GLV",
        "category": "downhole",
        "lambda_crit": 13.0, "lambda_S": 0.2, "lambda_D": 13.0,
        "lambda_DU": 13.0, "lambda_DU_70": 14.0,
        "DC": 0.00, "SFF": None, "beta": None,
        "section": "4.6.8", "notes": "",
    },

    # ══════════════════════════════════════════════════════════════
    # TABLE 3.11 — ÉQUIPEMENTS DE FORAGE
    # ══════════════════════════════════════════════════════════════
    {
        "key": "annular_preventer",
        "description": "Annular preventer (BOP)",
        "category": "drilling",
        "lambda_crit": 45.0, "lambda_S": 35.0, "lambda_D": 9.8,
        "lambda_DU": 9.8, "lambda_DU_70": None,
        "DC": 0.00, "SFF": 0.80, "beta": None,
        "section": "4.7.1",
        "notes": "λ_DU_70% non disponible pour les équipements de forage. β spécifique non disponible.",
    },
    {
        "key": "ram_preventer",
        "description": "Ram preventer (BOP)",
        "category": "drilling",
        "lambda_crit": 3.8, "lambda_S": 0.4, "lambda_D": 3.4,
        "lambda_DU": 3.4, "lambda_DU_70": None,
        "DC": 0.00, "SFF": 0.10, "beta": None,
        "section": "4.7.2", "notes": "",
    },
    {
        "key": "choke_kill_valve",
        "description": "Choke and kill valve",
        "category": "drilling",
        "lambda_crit": 0.9, "lambda_S": 0.2, "lambda_D": 0.8,
        "lambda_DU": 0.8, "lambda_DU_70": None,
        "DC": 0.00, "SFF": 0.20, "beta": None,
        "section": "4.7.3", "notes": "",
    },
    {
        "key": "choke_kill_line",
        "description": "Choke and kill line",
        "category": "drilling",
        "lambda_crit": 24.0, "lambda_S": 2.0, "lambda_D": 22.0,
        "lambda_DU": 22.0, "lambda_DU_70": None,
        "DC": 0.00, "SFF": 0.10, "beta": None,
        "section": "4.7.4", "notes": "",
    },
    {
        "key": "hydraulic_connector",
        "description": "Hydraulic connector (BOP/riser)",
        "category": "drilling",
        "lambda_crit": 4.1, "lambda_S": 1.0, "lambda_D": 3.1,
        "lambda_DU": 3.1, "lambda_DU_70": None,
        "DC": 0.00, "SFF": 0.25, "beta": None,
        "section": "4.7.5", "notes": "",
    },
    {
        "key": "multiplex_control_system",
        "description": "Multiplex control system (BOP, with redundant pods)",
        "category": "drilling",
        "lambda_crit": 124.0, "lambda_S": 0.0, "lambda_D": 124.0,
        "lambda_DU": 62.0, "lambda_DU_70": None,
        "DC": 0.50, "SFF": 0.50, "beta": None,
        "section": "4.7.6",
        "notes": "Taux total pour TOUTES les fonctions du système (pods redondants inclus). "
                 "Pour un pod individuel, utiliser approximativement la moitié.",
    },
    {
        "key": "pilot_control_system",
        "description": "Pilot control system (BOP)",
        "category": "drilling",
        "lambda_crit": 102.0, "lambda_S": 0.0, "lambda_D": 102.0,
        "lambda_DU": 102.0, "lambda_DU_70": None,
        "DC": 0.00, "SFF": 0.00, "beta": None,
        "section": "4.7.7", "notes": "",
    },
    {
        "key": "acoustic_backup_control",
        "description": "Acoustic backup control system (BOP)",
        "category": "drilling",
        "lambda_crit": 37.0, "lambda_S": 0.0, "lambda_D": 37.0,
        "lambda_DU": 37.0, "lambda_DU_70": None,
        "DC": 0.00, "SFF": 0.00, "beta": None,
        "section": "4.7.8", "notes": "",
    },
]


# ─────────────────────────────────────────────────────────────────
# Construction du dictionnaire (conversion 10⁻⁶/h → 1/h)
# ─────────────────────────────────────────────────────────────────

_DB: Dict[str, PDSEntry] = {}

for _r in _RAW:
    _entry = PDSEntry(
        key=_r["key"],
        description=_r["description"],
        category=_r["category"],
        lambda_crit=_e6(_r.get("lambda_crit")),
        lambda_S=_e6(_r.get("lambda_S")),
        lambda_D=_e6(_r.get("lambda_D")),
        lambda_DU=_e6(_r["lambda_DU"]),
        lambda_DU_70=_e6(_r.get("lambda_DU_70")),
        lambda_DU_90_lo=_e6(_r.get("lambda_DU_90_lo")),
        lambda_DU_90_hi=_e6(_r.get("lambda_DU_90_hi")),
        DC=_r["DC"],
        SFF=_r.get("SFF"),
        beta=_r.get("beta"),
        RHF=_r.get("RHF"),
        section=_r.get("section", ""),
        notes=_r.get("notes", ""),
        source="PDS2021",
    )
    _DB[_entry.key] = _entry


# ─────────────────────────────────────────────────────────────────
# Patch RHF (Table 3.14) et intervalles de confiance (Tables 3.15–3.18)
# appliqués sur les entrées déjà construites
# ─────────────────────────────────────────────────────────────────

_RHF_PATCH: Dict[str, float] = {
    # Transmetteurs process
    "level_transmitter": 0.20,
    "level_transmitter_displacer": 0.20,
    "level_transmitter_diff_pressure": 0.20,
    "level_transmitter_radar": 0.20,
    "level_transmitter_nuclear": 0.20,
    "pressure_transmitter": 0.30,
    "pressure_transmitter_piezoresistive": 0.30,
    "flow_transmitter": 0.20,
    "temperature_transmitter": 0.30,
    # Détecteurs F&G
    "smoke_detector": 0.60,
    "heat_detector": 0.60,
    "catalytic_point_gas_detector": 0.60,
    "ir_point_gas_detector": 0.40,
    "aspirated_ir_point_gas_detector": 0.40,
    "line_gas_detector": 0.40,
    "electrochemical_detector": 0.40,
    "flame_detector": 0.40,
    # Pushbuttons
    "manual_pushbutton_outdoor": 0.60,
    "cap_switch_indoor": 0.60,
    # NOTE: position_switch et aspirator_system_flow_switch ABSENTS de Table 3.14
    # → RHF non attribué (None) — valeurs précédentes de 0.60 étaient inventées
    # Logique
    "std_plc_analog_input": 0.10,
    "std_plc_cpu": 0.10,
    "std_plc_digital_output": 0.10,
    "pss_analog_input": 0.40,
    "pss_cpu": 0.40,
    "pss_digital_output": 0.40,
    "hardwired_analog_input": 0.80,
    "hardwired_logic": 0.80,
    "hardwired_digital_output": 0.80,
    # Vannes topside arrêt
    "topside_esv_xv": 0.30,
    "topside_esv_xv_ball": 0.30,
    "topside_esv_xv_gate": 0.30,
    "riser_esv": 0.50,
    "topside_xt_pmv_pwv": 0.30,
    "topside_xt_hascv": 0.30,
    "topside_xt_glesdv": 0.30,
    "topside_xt_ciesdv": 0.30,
    "topside_hipps_valve": 0.50,
    "blowdown_valve": 0.30,
    "fast_opening_valve_fov": 0.30,
    "solenoid_pilot_valve": 0.30,
    "process_control_valve_frequent": 0.40,
    "process_control_valve_shutdown": 0.40,
    "pressure_relief_valve_psv": 0.50,  # spring operated
    "deluge_valve": 0.50,
    "fire_water_monitor_valve": 0.50,
    "water_mist_valve": 0.50,
    "sprinkler_valve": 0.50,
    "foam_valve": 0.50,
    "ballast_water_valve": 0.30,
    # Éléments finaux divers
    "fire_gas_damper": 0.30,
    "circuit_breaker": 0.60,
    "relay_contactor": 0.60,
}

# IC 90% [λ_DU_90_lo, λ_DU_90_hi] en ×10⁻⁶/h → converti ci-dessous
_CI_PATCH: Dict[str, tuple] = {
    # Table 3.15 — topside input devices
    "position_switch": (0.8, 1.7),
    "aspirator_system_flow_switch": (1.6, 3.8),
    "pressure_transmitter": (0.37, 0.61),
    "level_transmitter": (1.4, 3.2),
    "temperature_transmitter": (0.05, 0.26),
    "flow_transmitter": (0.7, 2.4),
    "catalytic_point_gas_detector": (1.0, 2.0),
    "aspirated_ir_point_gas_detector": (1.7, 4.7),
    "electrochemical_detector": (1.1, 2.4),
    "smoke_detector": (0.14, 0.18),
    "heat_detector": (0.2, 0.5),
    "flame_detector": (0.3, 0.4),
    "manual_pushbutton_outdoor": (0.14, 0.23),
    "cap_switch_indoor": (0.02, 0.35),
    # Table 3.16 — topside final elements
    "topside_esv_xv": (2.1, 2.6),       # all data; ancienne valeur (1.9,2.8) = sous-type ESD/PSD
    "topside_esv_xv_ball": (1.7, 2.4),  # §4.4.1.1 p103 — ajouté v0.7.5
    "topside_esv_xv_gate": (2.6, 4.2),  # §4.4.1.2 p105 — ajouté v0.7.5
    "riser_esv": (0.7, 3.9),
    # PSS — IC ajoutés v0.7.5 (§4.3.2.x p91-93)
    # IC 0-90% (one-sided) pour DU_obs=0 : pss_analog_input, pss_cpu
    # IC 5-95% pour pss_digital_output (1 DU obs)
    "pss_analog_input":   (0.0, 2.5),   # IC 0-90%, 0 DU obs
    "pss_cpu":            (0.0, 2.9),   # IC 0-90%, 0 DU obs
    "pss_digital_output": (0.01, 1.31), # IC 5-95%, 1 DU obs
    # Hardwired logic — IC ajouté v0.7.5 (§4.3.3.2 p95)
    "hardwired_logic":    (0.0, 19.0),  # IC 0-90%, 0 DU obs, 2 tags seulement — très large
    # Fire central — IC ajouté v0.7.5 (§4.3.4.1 p97)
    "fire_central":       (0.03, 3.1),  # IC 5-95%, 1 DU obs
    # Galvanic barrier — IC ajouté v0.7.5 (§4.3.4.2 p98)
    "galvanic_barrier":   (0.0, 4.7),   # IC 0-90%, 0 DU obs
    # topside_xt_pmv_pwv : IC retirée — aucune IC explicite pour Best Estimate combiné (§4.4.3)
    "topside_xt_hascv": (2.4, 6.9),
    "topside_xt_glesdv": (0.01, 0.92),
    "topside_xt_ciesdv": (0.3, 5.6),
    "topside_hipps_valve": (0.1, 1.6),
    "blowdown_valve": (2.5, 4.1),        # corrigé v0.7.5 : borne basse 2.1→2.5 (oper. review §4.4.8)
    "fast_opening_valve_fov": (3.7, 10.0),
    "solenoid_pilot_valve": (0.2, 0.4),
    "pressure_relief_valve_psv": (1.2, 1.6),   # IC 5-95% oper. review (corrigé v0.7.6 — (1.5,2.4) sans source)
    "deluge_valve": (0.4, 1.1),                  # IC 5-95% oper. review seul (corrigé v0.7.6 — (0.8,2.5) sans source)
    "fire_water_monitor_valve": (0.9, 6.0),      # IC 5-95% oper. review seul (corrigé v0.7.6 — (0.5,4.4) sans source)
    # fire_water_pump_diesel_* : IC retirées — aucune IC système dans les dossiers §4.4.20-22
    "fire_water_monitor": (0.1, 6.9),
    "water_mist_valve": (0.3, 1.6),
    "sprinkler_valve": (0.0, 9.4),      # IC 0-90% (DU_obs=0, one-sided) — corrigé v0.7.6 (0.5,8.3 sans source)
    "foam_valve": (2.1, 7.1),
    "ballast_water_valve": (0.2, 1.1),
    # fire_water_pump_diesel_electric/hydraulic/mechanical : IC retirées — aucune IC système dans dossiers §4.4.20-22
    "fire_gas_damper": (2.8, 3.5),
    "rupture_disc": (0.0, 0.5),
    "relay_contactor": (0.0, 0.4),
    "fire_door": (2.3, 3.1),
    "watertight_door": (1.9, 4.5),
    "emergency_generator": (3.4, 18.0),
    "lifeboat_engines": (5.5, 20.0),
    "ups_battery_package": (0.03, 2.5),
    "emergency_lights": (3.4, 4.1),
    "flashing_beacons": (0.1, 0.3),
    "lifeboat_radio": (6.2, 21.0),
    # Table 3.17 — subsea
    "subsea_pressure_sensor": (0.2, 1.3),
    "subsea_pressure_temperature_sensor": (0.1, 1.4),
    "subsea_flow_sensor": (0.3, 3.4),
    "subsea_sem": (0.1, 1.9),
    "subsea_xt_pmv_pwv": (0.5, 0.8),
    "subsea_xt_xov": (0.01, 0.25),
    "subsea_xt_amv": (0.03, 0.31),
    "subsea_xt_civ_miv": (0.1, 0.7),
    # Table 3.18 — downhole
    "trscassv_type_a": (3.0, 4.4),
    "trscassv_type_b": (2.8, 5.3),
    "wrciv": (1.1, 2.8),
    "trciv": (0.02, 1.4),
    "gas_lift_valve_glv": (12.0, 14.0),
    "dhsv_trscssv_topside": (5.7, 6.7),
    "dhsv_trscssv_subsea": (1.3, 1.8),
    "dhsv_wrscssv_topside": (14.0, 17.0),
    "dhsv_wrscssv_subsea": (2.1, 10.0),
}

for _key, _rhf in _RHF_PATCH.items():
    if _key in _DB:
        _DB[_key].RHF = _rhf

for _key, (_lo, _hi) in _CI_PATCH.items():
    if _key in _DB:
        _DB[_key].lambda_DU_90_lo = _lo * 1e-6
        _DB[_key].lambda_DU_90_hi = _hi * 1e-6


# ─────────────────────────────────────────────────────────────────
# Sous-types level transmitter (§4.2.4, Table 3.18-like breakdown)
# ─────────────────────────────────────────────────────────────────

_LEVEL_SUBTYPES = [
    {
        "key": "level_transmitter_displacer",
        "description": "Level transmitter — measuring principle: displacer",
        "category": "topside_input",
        "lambda_DU": 0.7, "lambda_DU_70": 1.1,
        "lambda_DU_90_lo": 0.2, "lambda_DU_90_hi": 1.9,
        "DC": 0.70, "SFF": 0.82, "beta": 0.10, "RHF": 0.20,
        "section": "4.2.4",
        "notes": "Typiquement utilisé pour tanks de stockage simples (moins de problèmes d'interface/mousse). "
                 "λ_DU inférieur à la moyenne générique.",
    },
    {
        "key": "level_transmitter_diff_pressure",
        "description": "Level transmitter — measuring principle: differential pressure",
        "category": "topside_input",
        "lambda_DU": 3.2, "lambda_DU_70": 3.7,
        "lambda_DU_90_lo": 2.2, "lambda_DU_90_hi": 4.6,
        "DC": 0.70, "SFF": 0.82, "beta": 0.10, "RHF": 0.20,
        "section": "4.2.4",
        "notes": "λ_DU > moyenne générique. Variabilité avec application (interface, gravité variable).",
    },
    {
        "key": "level_transmitter_radar",
        "description": "Level transmitter — measuring principle: free space radar",
        "category": "topside_input",
        "lambda_DU": 2.7, "lambda_DU_70": 3.7,
        "lambda_DU_90_lo": 1.2, "lambda_DU_90_hi": 5.4,
        "DC": 0.70, "SFF": 0.82, "beta": 0.10, "RHF": 0.20,
        "section": "4.2.4", "notes": "",
    },
    {
        "key": "level_transmitter_nuclear",
        "description": "Level transmitter — measuring principle: nuclear (gamma)",
        "category": "topside_input",
        "lambda_DU": 4.1, "lambda_DU_70": 6.1,
        "lambda_DU_90_lo": 1.4, "lambda_DU_90_hi": 9.4,
        "DC": 0.70, "SFF": 0.82, "beta": 0.10, "RHF": 0.20,
        "section": "4.2.4",
        "notes": "Grande incertitude (faible expérience opérationnelle). Applications souvent difficiles.",
    },
]

for _r2 in _LEVEL_SUBTYPES:
    _e2 = PDSEntry(
        key=_r2["key"],
        description=_r2["description"],
        category=_r2["category"],
        lambda_DU=_r2["lambda_DU"] * 1e-6,
        lambda_DU_70=_r2.get("lambda_DU_70", 0) * 1e-6 if _r2.get("lambda_DU_70") else None,
        lambda_DU_90_lo=_r2.get("lambda_DU_90_lo", 0) * 1e-6 if _r2.get("lambda_DU_90_lo") is not None else None,
        lambda_DU_90_hi=_r2.get("lambda_DU_90_hi", 0) * 1e-6 if _r2.get("lambda_DU_90_hi") is not None else None,
        DC=_r2["DC"],
        SFF=_r2.get("SFF"),
        beta=_r2.get("beta"),
        RHF=_r2.get("RHF"),
        section=_r2.get("section", ""),
        notes=_r2.get("notes", ""),
        source="PDS2021",
    )
    _DB[_e2.key] = _e2


# ─────────────────────────────────────────────────────────────────
# Pression transmitter piezorésistif (§4.2.3)
# ─────────────────────────────────────────────────────────────────

_DB["pressure_transmitter_piezoresistive"] = PDSEntry(
    key="pressure_transmitter_piezoresistive",
    description="Pressure transmitter — measuring principle: piezoresistive",
    category="topside_input",
    lambda_DU=0.2e-6,
    lambda_DU_70=0.4e-6,
    lambda_DU_90_lo=0.01e-6,
    lambda_DU_90_hi=0.74e-6,
    DC=0.65, SFF=0.75, beta=0.10, RHF=0.30,
    section="4.2.3",
    notes="Basé sur 1 seule observation — forte incertitude. Utiliser valeur générique si insuffisant.",
    source="PDS2021",
)


# ─────────────────────────────────────────────────────────────────
# Temperature transmitter thermocouple (§4.2.5)
# λ_DU identique à la moyenne générique (0.1) — thermocouple domine la population
# (407 tags / 7 installations / 4 opérateurs — 2009-2019 — T=1.4×10⁷ h — 2 DU obs)
# ─────────────────────────────────────────────────────────────────
_DB["temperature_transmitter_thermocouple"] = PDSEntry(
    key="temperature_transmitter_thermocouple",
    description="Temperature transmitter — measuring principle: thermocouple",
    category="topside_input",
    lambda_DU=0.1e-6,
    lambda_DU_70=0.3e-6,
    lambda_DU_90_lo=0.03e-6,
    lambda_DU_90_hi=0.46e-6,
    DC=0.70, SFF=0.82, beta=0.10, RHF=0.30,
    section="4.2.5",
    notes="Basé sur 2 observations (faible expérience). IC très large [0.03–0.46]. "
          "Utiliser valeur générique temperature_transmitter si données insuffisantes.",
    source="PDS2021",
)


# ─────────────────────────────────────────────────────────────────
# DHSV sous-types par emplacement du puits (Table 3.18)
# ─────────────────────────────────────────────────────────────────
# Remplace les entrées génériques dhsv_trscssv / dhsv_wrscssv qui
# ne correspondent ni à topside (6.2) ni à subsea (1.55)

_DB["dhsv_trscssv_topside"] = PDSEntry(
    key="dhsv_trscssv_topside",
    description="Downhole safety valve — TRSCSSV, topside-located wells",
    category="downhole",
    lambda_crit=4.4e-6, lambda_S=0.4e-6, lambda_D=4.0e-6,
    lambda_DU=6.2e-6, lambda_DU_70=6.3e-6,
    lambda_DU_90_lo=5.7e-6, lambda_DU_90_hi=6.7e-6,
    DC=0.00, SFF=None, beta=None,
    section="4.6.2",
    notes="Puits localisés topside. Différences selon type de service — voir §4.6.1 et §4.6.2.",
    source="PDS2021",
)

_DB["dhsv_trscssv_subsea"] = PDSEntry(
    key="dhsv_trscssv_subsea",
    description="Downhole safety valve — TRSCSSV, subsea-located wells",
    category="downhole",
    lambda_crit=None, lambda_S=None, lambda_D=None,
    lambda_DU=1.55e-6, lambda_DU_70=1.64e-6,
    lambda_DU_90_lo=1.3e-6, lambda_DU_90_hi=1.8e-6,
    DC=0.00, SFF=None, beta=None,
    section="4.6.2",
    notes="Puits localisés subsea. λ_DU notablement inférieur aux puits topside.",
    source="PDS2021",
)

_DB["dhsv_wrscssv_topside"] = PDSEntry(
    key="dhsv_wrscssv_topside",
    description="Downhole safety valve — WRSCSSV, topside-located wells",
    category="downhole",
    lambda_crit=19.0e-6, lambda_S=4.3e-6, lambda_D=15.0e-6,
    lambda_DU=15.0e-6, lambda_DU_70=16.0e-6,
    lambda_DU_90_lo=14.0e-6, lambda_DU_90_hi=17.0e-6,
    DC=0.00, SFF=None, beta=None,
    section="4.6.3",
    notes="Puits localisés topside.",
    source="PDS2021",
)

_DB["dhsv_wrscssv_subsea"] = PDSEntry(
    key="dhsv_wrscssv_subsea",
    description="Downhole safety valve — WRSCSSV, subsea-located wells",
    category="downhole",
    lambda_crit=None, lambda_S=None, lambda_D=None,
    lambda_DU=4.8e-6, lambda_DU_70=6.5e-6,
    lambda_DU_90_lo=2.1e-6, lambda_DU_90_hi=10.0e-6,
    DC=0.00, SFF=None, beta=None,
    section="4.6.3",
    notes="Puits localisés subsea. Données limitées — IC large. Voir §4.6.1 et §4.6.3.",
    source="PDS2021",
)


# ─────────────────────────────────────────────────────────────────
# Sous-types p56–86 (rapport 13b — v0.7.4)
# Règle : λ_D / λ_S / λ_crit / SFF = None (non décomposés au niveau sous-type PDS)
#         DC / β / RHF = hérités du parent sauf mention explicite
#         IC 0-90% (one-sided) pour DU_obs=0 — documenté dans notes
# ─────────────────────────────────────────────────────────────────

# ── §4.2.6 Flow Transmitter — sous-types par application ──────────

_DB["flow_transmitter_hvac"] = PDSEntry(
    key="flow_transmitter_hvac",
    description="Flow transmitter — application: HVAC",
    category="topside_input",
    lambda_DU=0.9e-6, lambda_DU_70=2.3e-6,
    lambda_DU_90_lo=0.05e-6, lambda_DU_90_hi=4.4e-6,
    DC=0.65, beta=0.10, RHF=0.20,
    section="4.2.6",
    notes="IC 5-95% très large (1 DU obs sur 1.1×10⁶h, 54 tags, 3 inst., 1 op.). "
          "λ_DU inférieur à la valeur générique (0.9 vs 1.4). "
          "DC/β identiques à l'entrée générique flow_transmitter (non décomposés). "
          "Source : PDS 2021 §4.2.6 p57.",
    source="PDS2021",
)

_DB["flow_transmitter_process"] = PDSEntry(
    key="flow_transmitter_process",
    description="Flow transmitter — application: process",
    category="topside_input",
    lambda_DU=1.5e-6, lambda_DU_70=1.9e-6,
    lambda_DU_90_lo=0.7e-6, lambda_DU_90_hi=2.7e-6,
    DC=0.65, beta=0.10, RHF=0.20,
    section="4.2.6",
    notes="8 DU obs / 5.4×10⁶h / 106 tags / 4 inst. / 4 op. "
          "λ_DU légèrement supérieur à la valeur générique (1.5 vs 1.4). "
          "DC/β identiques à l'entrée générique flow_transmitter (non décomposés). "
          "Source : PDS 2021 §4.2.6 p57.",
    source="PDS2021",
)

# ── §4.2.10 Line Gas Detector — sous-types par principe de mesure ─

_DB["line_gas_detector_ir"] = PDSEntry(
    key="line_gas_detector_ir",
    description="Line gas detector — measuring principle: IR",
    category="topside_detector",
    lambda_DU=0.44e-6, lambda_DU_70=0.47e-6,
    lambda_DU_90_lo=0.36e-6, lambda_DU_90_hi=0.53e-6,
    DC=0.90, beta=0.10, RHF=0.40,
    section="4.2.10",
    notes="74 DU obs / 1.7×10⁸h / 2566 tags / 34 inst. / 6 op. "
          "Données quasi-identiques à l'ensemble (population dominée par IR). "
          "IC 5-95%. Source : PDS 2021 §4.2.10 p66.",
    source="PDS2021",
)

_DB["line_gas_detector_laser"] = PDSEntry(
    key="line_gas_detector_laser",
    description="Line gas detector — measuring principle: laser",
    category="topside_detector",
    lambda_DU=0.28e-6, lambda_DU_70=0.45e-6,
    lambda_DU_90_lo=0.0e-6, lambda_DU_90_hi=0.83e-6,
    DC=0.90, beta=0.10, RHF=0.40,
    section="4.2.10",
    notes="⚠ Valeur a priori bayésienne (0 DU obs sur 1.1×10⁶h, 26 tags, 3 inst., 2 op.). "
          "Prior = taux IR ligne. IC 0-90% (asymétrique, borne basse = 0). "
          "Utiliser avec prudence — données très limitées. "
          "Source : PDS 2021 §4.2.10 p66.",
    source="PDS2021",
)

# ── §4.2.12 Smoke Detector — sous-types par principe/application ──

_DB["smoke_detector_ionization"] = PDSEntry(
    key="smoke_detector_ionization",
    description="Smoke detector — measuring principle: ionization",
    category="topside_detector",
    lambda_DU=0.14e-6, lambda_DU_70=0.17e-6,
    lambda_DU_90_lo=0.0e-6, lambda_DU_90_hi=0.32e-6,
    DC=0.80, beta=0.10, RHF=0.60,
    section="4.2.12",
    notes="⚠ Valeur a priori bayésienne (0 DU obs sur 9.0×10⁵h, 22 tags, 2 inst., 1 op.). "
          "Prior = taux IR/Optical. IC 0-90% (one-sided, borne basse = 0). "
          "Très faible population — incertitude élevée. "
          "Source : PDS 2021 §4.2.12 p72.",
    source="PDS2021",
)

_DB["smoke_detector_ir_optical"] = PDSEntry(
    key="smoke_detector_ir_optical",
    description="Smoke detector — measuring principle: IR/optical",
    category="topside_detector",
    lambda_DU=0.20e-6, lambda_DU_70=0.21e-6,
    lambda_DU_90_lo=0.17e-6, lambda_DU_90_hi=0.24e-6,
    DC=0.80, beta=0.10, RHF=0.60,
    section="4.2.12",
    notes="Population principale (96 DU obs / 4.8×10⁸h / 11778 tags / 16 inst. / 4 op.). "
          "IC 5-95% très serré — données abondantes. "
          "λ_DU légèrement supérieur à la valeur générique (0.20 vs 0.16). "
          "Source : PDS 2021 §4.2.12 p72.",
    source="PDS2021",
)

_DB["smoke_detector_ir_aspirated"] = PDSEntry(
    key="smoke_detector_ir_aspirated",
    description="Smoke detector — measuring principle: IR aspirated",
    category="topside_detector",
    lambda_DU=4.4e-6, lambda_DU_70=5.9e-6,
    lambda_DU_90_lo=2.1e-6, lambda_DU_90_hi=8.2e-6,
    DC=0.80, beta=0.10, RHF=0.60,
    section="4.2.12",
    notes="⚠ CRITIQUE : λ_DU = 27× la valeur générique. "
          "Cause : fuites piping aspirateur / capteur débit (même mécanisme §4.2.9). "
          "7 DU obs / 1.6×10⁶h / 44 tags / 4 inst. / 1 op. "
          "Ne pas utiliser l'entrée générique smoke_detector pour les installations avec "
          "détecteurs aspirés. Source : PDS 2021 §4.2.12 p72.",
    source="PDS2021",
)

# ── §4.2.13 Heat Detector — sous-types par principe de mesure ─────

_DB["heat_detector_fixed_temperature"] = PDSEntry(
    key="heat_detector_fixed_temperature",
    description="Heat detector — measuring principle: fixed temperature",
    category="topside_detector",
    lambda_DU=0.20e-6, lambda_DU_70=0.30e-6,
    lambda_DU_90_lo=0.03e-6, lambda_DU_90_hi=0.54e-6,
    DC=0.60, beta=0.10, RHF=0.60,
    section="4.2.13",
    notes="2 DU obs / 1.2×10⁷h / 317 tags / 14 inst. / 3 op. "
          "IC 5-95%. λ_DU inférieur à la valeur générique (0.20 vs 0.37). "
          "Source : PDS 2021 §4.2.13 p76.",
    source="PDS2021",
)

_DB["heat_detector_rate_of_rise"] = PDSEntry(
    key="heat_detector_rate_of_rise",
    description="Heat detector — measuring principle: rate of rise",
    category="topside_detector",
    lambda_DU=0.30e-6, lambda_DU_70=0.40e-6,
    lambda_DU_90_lo=0.10e-6, lambda_DU_90_hi=0.70e-6,
    DC=0.60, beta=0.10, RHF=0.60,
    section="4.2.13",
    notes="3 DU obs / 1.1×10⁷h / 281 tags / 9 inst. / 1 op. "
          "IC 5-95%. IC légèrement plus large que fixed temperature (1 opérateur). "
          "PDS note différence limitée entre principes selon experts. "
          "Source : PDS 2021 §4.2.13 p76.",
    source="PDS2021",
)

# ── §4.2.15 Manual Pushbutton outdoor — sous-types ────────────────

_DB["manual_pushbutton_electric_fg"] = PDSEntry(
    key="manual_pushbutton_electric_fg",
    description="Manual pushbutton / call point — actuation: electric, application: F&G",
    category="topside_input",
    lambda_DU=0.05e-6, lambda_DU_70=0.13e-6,
    lambda_DU_90_lo=0.003e-6, lambda_DU_90_hi=0.25e-6,
    DC=0.20, beta=0.05, RHF=0.60,
    section="4.2.15",
    notes="1 DU obs / 1.9×10⁷h / 330 tags / 13 inst. / 1 op. "
          "IC 5-95%. λ_DU 8× inférieur à Pneumatic ESD. "
          "Source : PDS 2021 §4.2.15 p82.",
    source="PDS2021",
)

_DB["manual_pushbutton_pneumatic_esd"] = PDSEntry(
    key="manual_pushbutton_pneumatic_esd",
    description="Manual pushbutton / call point — actuation: pneumatic, application: ESD",
    category="topside_input",
    lambda_DU=0.42e-6, lambda_DU_70=0.53e-6,
    lambda_DU_90_lo=0.22e-6, lambda_DU_90_hi=0.73e-6,
    DC=0.20, beta=0.05, RHF=0.60,
    section="4.2.15",
    notes="9 DU obs / 2.2×10⁷h / 338 tags / 12 inst. / 1 op. "
          "IC 5-95%. λ_DU 8× supérieur à Electric F&G — distinction critique ESD vs F&G. "
          "Source : PDS 2021 §4.2.15 p82.",
    source="PDS2021",
)

_DB["manual_pushbutton_addressable"] = PDSEntry(
    key="manual_pushbutton_addressable",
    description="Manual pushbutton / call point — design: addressable",
    category="topside_input",
    lambda_DU=0.24e-6, lambda_DU_70=1.57e-6,
    lambda_DU_90_lo=0.65e-6, lambda_DU_90_hi=2.17e-6,
    DC=0.20, beta=0.05, RHF=0.60,
    section="4.2.15",
    notes="9 DU obs / 7.3×10⁶h / 650 tags / 11 inst. / 1 op. "
          "⚠ IC 5-95% très asymétrique (λ_DU_70=1.57 ≫ λ_DU=0.24) — T faible, 1 opérateur. "
          "Source : PDS 2021 §4.2.15 p82.",
    source="PDS2021",
)

_DB["manual_pushbutton_non_addressable"] = PDSEntry(
    key="manual_pushbutton_non_addressable",
    description="Manual pushbutton / call point — design: non-addressable",
    category="topside_input",
    lambda_DU=0.94e-6, lambda_DU_70=1.52e-6,
    lambda_DU_90_lo=0.69e-6, lambda_DU_90_hi=2.05e-6,
    DC=0.20, beta=0.05, RHF=0.60,
    section="4.2.15",
    notes="11 DU obs / 8.9×10⁶h / 143 tags / 2 inst. / 1 op. "
          "λ_DU le plus élevé de tous les sous-types pushbutton (0.94). "
          "Source : PDS 2021 §4.2.15 p82.",
    source="PDS2021",
)


# ─────────────────────────────────────────────────────────────────
# Sous-types p87–117 (rapport 14 — v0.7.5)
# ─────────────────────────────────────────────────────────────────

# ── §4.4.1 Topside ESV/XV — sous-types par taille ────────────────

_DB["topside_esv_xv_size_small"] = PDSEntry(
    key="topside_esv_xv_size_small",
    description="Topside ESV and XV — size: small (0–1 inch)",
    category="topside_valve",
    lambda_DU=1.3e-6, lambda_DU_70=1.7e-6,
    lambda_DU_90_lo=0.6e-6, lambda_DU_90_hi=2.6e-6,
    DC=0.05, beta=0.08, RHF=0.30,
    section="4.4.1",
    notes="6 DU obs / 97 tags / 4.6×10⁶h / 5 inst. IC 5-95%. "
          "Source : PDS 2021 §4.4.1 p99-100.",
    source="PDS2021",
)

_DB["topside_esv_xv_size_medium"] = PDSEntry(
    key="topside_esv_xv_size_medium",
    description="Topside ESV and XV — size: medium (1–3 inches)",
    category="topside_valve",
    lambda_DU=1.7e-6, lambda_DU_70=1.9e-6,
    lambda_DU_90_lo=1.3e-6, lambda_DU_90_hi=2.2e-6,
    DC=0.05, beta=0.08, RHF=0.30,
    section="4.4.1",
    notes="47 DU obs / 407 tags / 2.3×10⁷h / 5 inst. IC 5-95%. "
          "Source : PDS 2021 §4.4.1 p99-100.",
    source="PDS2021",
)

_DB["topside_esv_xv_size_large"] = PDSEntry(
    key="topside_esv_xv_size_large",
    description="Topside ESV and XV — size: large (3–18 inches)",
    category="topside_valve",
    lambda_DU=3.0e-6, lambda_DU_70=3.2e-6,
    lambda_DU_90_lo=2.4e-6, lambda_DU_90_hi=3.7e-6,
    DC=0.05, beta=0.08, RHF=0.30,
    section="4.4.1",
    notes="85 DU obs / 443 tags / 2.3×10⁷h / 5 inst. IC 5-95%. "
          "Source : PDS 2021 §4.4.1 p99-100.",
    source="PDS2021",
)

_DB["topside_esv_xv_size_xlarge"] = PDSEntry(
    key="topside_esv_xv_size_xlarge",
    description="Topside ESV and XV — size: extra large (>18 inches)",
    category="topside_valve",
    lambda_DU=7.0e-6, lambda_DU_70=7.9e-6,
    lambda_DU_90_lo=5.1e-6, lambda_DU_90_hi=10.0e-6,
    DC=0.05, beta=0.08, RHF=0.30,
    section="4.4.1",
    notes="34 DU obs / 77 tags / 4.2×10⁶h / 5 inst. IC 5-95%. "
          "λ_DU ≈ 3× la valeur Small — séparation critique pour grosses vannes (e.g. blowdown headers). "
          "Source : PDS 2021 §4.4.1 p100.",
    source="PDS2021",
)

# ── §4.4.1 Topside ESV/XV — sous-type butterfly ──────────────────

_DB["topside_esv_xv_butterfly"] = PDSEntry(
    key="topside_esv_xv_butterfly",
    description="Topside ESV and XV — design: butterfly valve",
    category="topside_valve",
    lambda_DU=3.1e-6, lambda_DU_70=3.7e-6,
    lambda_DU_90_lo=1.7e-6, lambda_DU_90_hi=4.9e-6,
    DC=0.05, beta=0.08, RHF=0.30,
    section="4.4.1",
    notes="13 DU obs / 88 tags / 4.0×10⁶h / 7 inst. IC 5-95%. "
          "IC large (7 inst. mais peu de tags). "
          "Source : PDS 2021 §4.4.1 p100.",
    source="PDS2021",
)

# ── §4.4.1 Topside ESV/XV — table service/medium (p101) ──────────
# Valeurs uniquement λ_DU — pas d'IC ni λ_DU_70 ni λ_D/λ_S/λ_crit
# Source : expert + données, présentées sous forme de table de référence.
# DC=0.05, β=0.08 hérités du parent.

_ESV_SERVICE_MEDIUM = [
    # Ball valves ≤ 3"
    ("topside_esv_xv_ball_le3in_clean",   "Topside ESV/XV — ball ≤3\", clean service",            1.2),
    ("topside_esv_xv_ball_le3in_normal",  "Topside ESV/XV — ball ≤3\", normal HC service",         2.0),
    ("topside_esv_xv_ball_le3in_dirty",   "Topside ESV/XV — ball ≤3\", dirty/severe service",      4.0),
    # Ball valves > 3"
    ("topside_esv_xv_ball_gt3in_clean",   "Topside ESV/XV — ball >3\", clean service",             1.6),
    ("topside_esv_xv_ball_gt3in_normal",  "Topside ESV/XV — ball >3\", normal HC service",         2.6),
    ("topside_esv_xv_ball_gt3in_dirty",   "Topside ESV/XV — ball >3\", dirty/severe service",      5.2),
    # Gate valves ≤ 3"
    ("topside_esv_xv_gate_le3in_clean",   "Topside ESV/XV — gate ≤3\", clean service",             1.7),
    ("topside_esv_xv_gate_le3in_normal",  "Topside ESV/XV — gate ≤3\", normal HC service",         2.8),
    ("topside_esv_xv_gate_le3in_dirty",   "Topside ESV/XV — gate ≤3\", dirty/severe service",      5.6),
    # Gate valves > 3"
    ("topside_esv_xv_gate_gt3in_clean",   "Topside ESV/XV — gate >3\", clean service",             2.2),
    ("topside_esv_xv_gate_gt3in_normal",  "Topside ESV/XV — gate >3\", normal HC service",         3.7),
    ("topside_esv_xv_gate_gt3in_dirty",   "Topside ESV/XV — gate >3\", dirty/severe service",      7.4),
]

for _key, _desc, _ldu in _ESV_SERVICE_MEDIUM:
    _DB[_key] = PDSEntry(
        key=_key,
        description=_desc,
        category="topside_valve",
        lambda_DU=_ldu * 1e-6,
        DC=0.05, beta=0.08, RHF=0.30,
        section="4.4.1",
        notes="Valeur issue de la table service/medium PDS 2021 p101. "
              "Expert + données. Aucun IC ni λ_DU_70 ni λ_D/S/crit disponibles pour ce niveau. "
              "Clean = fuel gas/utilities/N2. Normal HC = service process standard. "
              "Dirty/severe = corrosif, érosif, H2S, brut haute temp.",
        source="PDS2021",
    )

# ── §4.4.3 Topside XT PMV/PWV — sous-types ───────────────────────

_DB["topside_xt_pmv"] = PDSEntry(
    key="topside_xt_pmv",
    description="Topside XT valve — PMV (Production master valve), all wells",
    category="topside_valve",
    lambda_DU=2.0e-6, lambda_DU_70=2.2e-6,
    lambda_DU_90_lo=1.5e-6, lambda_DU_90_hi=2.6e-6,
    DC=0.05, beta=0.05, RHF=0.30,
    section="4.4.3",
    notes="45 DU obs / 471 tags / 2.2×10⁷h / 24 inst. / 4 op. Wellmaster data. IC 5-95%. "
          "PMV ≈ 3× PWV. Vanne maîtresse de production — LCP dominant. "
          "Source : PDS 2021 §4.4.3 p109.",
    source="PDS2021",
)

_DB["topside_xt_pwv"] = PDSEntry(
    key="topside_xt_pwv",
    description="Topside XT valve — PWV (Production wing valve), all wells",
    category="topside_valve",
    lambda_DU=0.7e-6, lambda_DU_70=0.8e-6,
    lambda_DU_90_lo=0.4e-6, lambda_DU_90_hi=1.1e-6,
    DC=0.05, beta=0.05, RHF=0.30,
    section="4.4.3",
    notes="16 DU obs / 464 tags / 2.2×10⁷h / 24 inst. / 4 op. Wellmaster data. IC 5-95%. "
          "PWV ≈ 3× inférieur à PMV. Source : PDS 2021 §4.4.3 p109.",
    source="PDS2021",
)

_DB["topside_xt_pmv_oil"] = PDSEntry(
    key="topside_xt_pmv_oil",
    description="Topside XT valve — PMV-H, oil production wells",
    category="topside_valve",
    lambda_DU=2.2e-6, lambda_DU_70=2.5e-6,
    lambda_DU_90_lo=1.7e-6, lambda_DU_90_hi=2.9e-6,
    DC=0.05, beta=0.05, RHF=0.30,
    section="4.4.3",
    notes="38 DU obs / 374 tags / 1.7×10⁷h / 24 inst. / 4 op. Wellmaster data. IC 5-95%. "
          "Source : PDS 2021 §4.4.3 p109.",
    source="PDS2021",
)

_DB["topside_xt_pmv_water_inj"] = PDSEntry(
    key="topside_xt_pmv_water_inj",
    description="Topside XT valve — PMV, water injection wells",
    category="topside_valve",
    lambda_DU=2.2e-6, lambda_DU_70=2.9e-6,
    lambda_DU_90_lo=1.5e-6, lambda_DU_90_hi=4.1e-6,
    DC=0.05, beta=0.05, RHF=0.30,
    section="4.4.3",
    notes="7 DU obs / 73 tags / 3.2×10⁶h / 13 inst. / 4 op. Wellmaster data. IC 5-95%. "
          "Source : PDS 2021 §4.4.3 p110.",
    source="PDS2021",
)

_DB["topside_xt_pwv_oil"] = PDSEntry(
    key="topside_xt_pwv_oil",
    description="Topside XT valve — PWV, oil production wells",
    category="topside_valve",
    lambda_DU=0.6e-6, lambda_DU_70=0.7e-6,
    lambda_DU_90_lo=0.3e-6, lambda_DU_90_hi=1.0e-6,
    DC=0.05, beta=0.05, RHF=0.30,
    section="4.4.3",
    notes="10 DU obs / 357 tags / 1.7×10⁷h / 24 inst. / 4 op. Wellmaster data. IC 5-95%. "
          "Source : PDS 2021 §4.4.3 p110.",
    source="PDS2021",
)

_DB["topside_xt_pwv_water_inj"] = PDSEntry(
    key="topside_xt_pwv_water_inj",
    description="Topside XT valve — PWV, water injection wells",
    category="topside_valve",
    lambda_DU=1.3e-6, lambda_DU_70=1.9e-6,
    lambda_DU_90_lo=0.5e-6, lambda_DU_90_hi=3.0e-6,
    DC=0.05, beta=0.05, RHF=0.30,
    section="4.4.3",
    notes="4 DU obs / 71 tags / 3.0×10⁶h / 13 inst. / 4 op. Wellmaster data. IC 5-95%. "
          "Source : PDS 2021 §4.4.3 p110.",
    source="PDS2021",
)


# ─────────────────────────────────────────────────────────────────
# Sous-types p118–148 (rapport 15 — v0.7.6)
# ─────────────────────────────────────────────────────────────────

# ── §4.4.12 PSV — sous-types par design et taille ────────────────

_DB["psv_pilot_operated"] = PDSEntry(
    key="psv_pilot_operated",
    description="Pressure relief valve — PSV, pilot operated",
    category="topside_valve",
    lambda_DU=3.3e-6, lambda_DU_70=3.8e-6,
    lambda_DU_90_lo=2.3e-6, lambda_DU_90_hi=4.8e-6,
    DC=0.0, beta=0.07,
    section="4.4.12",
    notes="22 DU obs / 214 tags / 6.6×10⁶h / 4 inst. (1 op.). IC 5-95%. "
          "λ_DU 2.5× supérieur au spring-operated. Source : PDS 2021 §4.4.12 p122.",
    source="PDS2021",
)

_DB["psv_spring_operated"] = PDSEntry(
    key="psv_spring_operated",
    description="Pressure relief valve — PSV, spring operated",
    category="topside_valve",
    lambda_DU=1.3e-6, lambda_DU_70=1.3e-6,
    lambda_DU_90_lo=1.1e-6, lambda_DU_90_hi=1.5e-6,
    DC=0.0, beta=0.07,
    section="4.4.12",
    notes="108 DU obs / 2033 tags / 8.6×10⁷h / 4 inst. (1 op.). IC 5-95% très serré. "
          "Source : PDS 2021 §4.4.12 p122.",
    source="PDS2021",
)

_DB["psv_size_small"] = PDSEntry(
    key="psv_size_small",
    description="Pressure relief valve — PSV, small (0–1 inch)",
    category="topside_valve",
    lambda_DU=1.7e-6, lambda_DU_70=1.9e-6,
    lambda_DU_90_lo=1.3e-6, lambda_DU_90_hi=2.2e-6,
    DC=0.0, beta=0.07,
    section="4.4.12",
    notes="51 DU obs / 617 tags / 3.0×10⁷h / 4 inst. (1 op.). IC 5-95%. "
          "Source : PDS 2021 §4.4.12 p122.",
    source="PDS2021",
)

_DB["psv_size_medium_large"] = PDSEntry(
    key="psv_size_medium_large",
    description="Pressure relief valve — PSV, medium/large (>1 inch)",
    category="topside_valve",
    lambda_DU=1.1e-6, lambda_DU_70=1.1e-6,
    lambda_DU_90_lo=0.7e-6, lambda_DU_90_hi=1.5e-6,
    DC=0.0, beta=0.07,
    section="4.4.12",
    notes="22 DU obs / 495 tags / 2.0×10⁷h / 4 inst. (1 op.). IC 5-95%. "
          "λ_DU_70=λ_DU (distribution serrée). "
          "Source : PDS 2021 §4.4.12 p122.",
    source="PDS2021",
)

# ── §4.4.16 Water Mist Valve — sous-types par design ─────────────

_DB["water_mist_valve_water_mist"] = PDSEntry(
    key="water_mist_valve_water_mist",
    description="Water mist valve — design: water mist release valve",
    category="topside_valve",
    lambda_DU=0.7e-6, lambda_DU_70=1.2e-6,
    lambda_DU_90_lo=0.1e-6, lambda_DU_90_hi=2.1e-6,
    DC=0.0, beta=0.08,
    section="4.4.16",
    notes="2 DU obs / 32 tags / 3.0×10⁶h / 3 inst. (1 op.). IC 5-95%. "
          "Source : PDS 2021 §4.4.16 p128.",
    source="PDS2021",
)

_DB["water_mist_valve_nitrogen_bottle"] = PDSEntry(
    key="water_mist_valve_nitrogen_bottle",
    description="Water mist valve — design: nitrogen bottle release valve",
    category="topside_valve",
    lambda_DU=1.0e-6, lambda_DU_70=1.5e-6,
    lambda_DU_90_lo=0.3e-6, lambda_DU_90_hi=2.5e-6,
    DC=0.0, beta=0.08,
    section="4.4.16",
    notes="3 DU obs / 47 tags / 3.1×10⁶h / 3 inst. (1 op.). IC 5-95%. "
          "Source : PDS 2021 §4.4.16 p128.",
    source="PDS2021",
)

# ── §4.4.20–22 Fire Water Pump — composants ──────────────────────
# RÈGLE DÉDUPLICATION : Diesel engine et Fire water pump ont des données STRICTEMENT
# identiques dans les 3 configurations (même population, même T, même DU_obs, même source).
# → 1 entrée chacun, partagée par Diesel Electric/Hydraulic/Mechanical.
# Les composants spécifiques (electric motor/generator, hydraulic motor/pump) ont leurs propres entrées.
# Catégorie : topside_final (composants système pompe incendie)

_DB["fw_pump_component_diesel_engine"] = PDSEntry(
    key="fw_pump_component_diesel_engine",
    description="Fire water pump — component: diesel engine",
    category="topside_final",
    lambda_DU=12.0e-6, lambda_DU_70=13.0e-6,
    lambda_DU_90_lo=9.9e-6, lambda_DU_90_hi=15.0e-6,
    DC=0.0, beta=0.05,
    section="4.4.20",
    notes="68 DU obs / 99 tags / 5.6×10⁶h / 28 inst. (1 op.). IC 5-95%. "
          "Données IDENTIQUES dans §4.4.20 (Diesel Electric), §4.4.21 (Diesel Hydraulic), "
          "§4.4.22 (Diesel Mechanical) — composant partagé, déduplication appliquée. "
          "Source : PDS 2021 §4.4.20 p133.",
    source="PDS2021",
)

_DB["fw_pump_component_fire_water_pump"] = PDSEntry(
    key="fw_pump_component_fire_water_pump",
    description="Fire water pump — component: fire water pump (centrifugal)",
    category="topside_final",
    lambda_DU=2.2e-6, lambda_DU_70=2.6e-6,
    lambda_DU_90_lo=1.5e-6, lambda_DU_90_hi=3.3e-6,
    DC=0.0, beta=0.05,
    section="4.4.20",
    notes="19 DU obs / 155 tags / 8.5×10⁶h / 29 inst. (3 op.). IC 5-95%. "
          "Données IDENTIQUES dans §4.4.20, §4.4.21, §4.4.22 — composant partagé. "
          "Source : PDS 2021 §4.4.20 p133.",
    source="PDS2021",
)

_DB["fw_pump_component_electric_generator"] = PDSEntry(
    key="fw_pump_component_electric_generator",
    description="Fire water pump — component: electric generator (diesel electric config)",
    category="topside_final",
    lambda_DU=8.7e-6, lambda_DU_70=9.9e-6,
    lambda_DU_90_lo=6.2e-6, lambda_DU_90_hi=12.0e-6,
    DC=0.0, beta=0.05,
    section="4.4.20",
    notes="28 DU obs / 57 tags / 3.2×10⁶h / 19 inst. (1 op.). IC 5-95%. "
          "Spécifique configuration Diesel Electric uniquement. "
          "Source : PDS 2021 §4.4.20 p133.",
    source="PDS2021",
)

_DB["fw_pump_component_electric_motor"] = PDSEntry(
    key="fw_pump_component_electric_motor",
    description="Fire water pump — component: electric motor (diesel electric config)",
    category="topside_final",
    lambda_DU=1.7e-6, lambda_DU_70=2.2e-6,
    lambda_DU_90_lo=0.8e-6, lambda_DU_90_hi=3.0e-6,
    DC=0.0, beta=0.05,
    section="4.4.20",
    notes="8 DU obs / 85 tags / 4.8×10⁶h / 23 inst. (1 op.). IC 5-95%. "
          "Spécifique configuration Diesel Electric uniquement. "
          "Source : PDS 2021 §4.4.20 p133.",
    source="PDS2021",
)

_DB["fw_pump_component_hydraulic_pump"] = PDSEntry(
    key="fw_pump_component_hydraulic_pump",
    description="Fire water pump — component: hydraulic pump (diesel hydraulic config)",
    category="topside_final",
    lambda_DU=3.4e-6, lambda_DU_70=4.8e-6,
    lambda_DU_90_lo=1.3e-6, lambda_DU_90_hi=7.2e-6,
    DC=0.0, beta=0.05,
    section="4.4.21",
    notes="5 DU obs / 26 tags / 1.5×10⁶h / 8 inst. (1 op.). IC 5-95%. "
          "Spécifique configuration Diesel Hydraulic. "
          "Données statistiquement identiques à fw_pump_component_fire_water_lift_pump "
          "— composants distincts dans PDS mais même population et observations. "
          "Source : PDS 2021 §4.4.21 p137.",
    source="PDS2021",
)

_DB["fw_pump_component_fire_water_lift_pump"] = PDSEntry(
    key="fw_pump_component_fire_water_lift_pump",
    description="Fire water pump — component: fire water lift pump (diesel hydraulic config)",
    category="topside_final",
    lambda_DU=3.4e-6, lambda_DU_70=4.8e-6,
    lambda_DU_90_lo=1.3e-6, lambda_DU_90_hi=7.2e-6,
    DC=0.0, beta=0.05,
    section="4.4.21",
    notes="5 DU obs / 26 tags / 1.5×10⁶h / 8 inst. (1 op.). IC 5-95%. "
          "Spécifique configuration Diesel Hydraulic. "
          "Même statistiques que fw_pump_component_hydraulic_pump (même installation, même T) "
          "— composants physiquement distincts dans PDS mais données indissociables. "
          "Source : PDS 2021 §4.4.21 p137.",
    source="PDS2021",
)

_DB["fw_pump_component_hydraulic_motor"] = PDSEntry(
    key="fw_pump_component_hydraulic_motor",
    description="Fire water pump — component: hydraulic motor (diesel hydraulic config)",
    lambda_DU=0.0e-6, lambda_DU_70=0.8e-6,
    lambda_DU_90_lo=0.0e-6, lambda_DU_90_hi=1.6e-6,
    DC=0.0, beta=0.05,
    category="topside_final",
    section="4.4.21",
    notes="⚠ 0 DU obs / 26 tags / 1.5×10⁶h / 8 inst. (1 op.). IC 0-90% (one-sided). "
          "λ_DU Best Estimate = 0 — utiliser avec prudence (population limitée). "
          "Spécifique configuration Diesel Hydraulic. "
          "Source : PDS 2021 §4.4.21 p137.",
    source="PDS2021",
)


# ─────────────────────────────────────────────────────────────────
# API publique
# ─────────────────────────────────────────────────────────────────

def get_lambda(key: str, source: str = "PDS2021") -> PDSEntry:
    """
    Retourne l'entrée de la base de données pour l'équipement donné.

    Paramètres
    ----------
    key    : identifiant snake_case (ex. "pressure_transmitter")
    source : source de données — seul "PDS2021" est disponible en v0.7.0

    Exceptions
    ----------
    KeyError si la clé n'existe pas — utiliser list_equipment() pour explorer.
    """
    if source != "PDS2021":
        raise ValueError(f"Source '{source}' non disponible. Sources : ['PDS2021']")
    if key not in _DB:
        close = [k for k in _DB if key.split("_")[0] in k]
        hint = f" Suggestions : {close[:5]}" if close else ""
        raise KeyError(f"Équipement '{key}' non trouvé dans PDS2021.{hint}")
    return _DB[key]


def list_equipment(category: Optional[str] = None, source: str = "PDS2021") -> List[PDSEntry]:
    """
    Liste tous les équipements disponibles, optionnellement filtrés par catégorie.

    Catégories disponibles :
        topside_input, topside_detector, control_logic,
        topside_valve, topside_final,
        subsea_input, subsea_logic, subsea_valve,
        downhole, drilling
    """
    entries = list(_DB.values())
    if category:
        entries = [e for e in entries if e.category == category]
    return entries


def search_equipment(keyword: str) -> List[PDSEntry]:
    """Recherche par mot-clé dans la description ou la clé."""
    kw = keyword.lower()
    return [e for e in _DB.values()
            if kw in e.description.lower() or kw in e.key.lower()]


def make_subsystem_params(
    entry: PDSEntry,
    T1: float,
    MTTR: float,
    architecture: str,
    M: int = 1,
    N: int = 1,
    MTTR_DU: float = -1.0,
    PTC: float = 1.0,
    T2: float = 0.0,
    lambda_SO: float = 0.0,
    beta_SO: float = 0.0,
    MTTR_SO: float = 0.0,
    lambda_FD: float = 0.0,
    beta_override: Optional[float] = None,
) -> dict:
    """
    Construit un dictionnaire de paramètres compatible SubsystemParams (PRISM).

    Paramètres opérationnels à fournir par l'utilisateur
    ---------------------------------------------------
    T1            : intervalle de test de preuve [h]
    MTTR          : temps moyen de réparation [h]
    architecture  : "1oo1", "1oo2", "2oo3", etc.
    M, N          : configuration MooN
    MTTR_DU       : MTTR spécifique DU (-1 → utiliser MTTR)
    PTC           : couverture du test de preuve (0-1, défaut 1.0)
    T2            : intervalle de test complet [h] (0 → PTC=1 implicite)
    lambda_SO, beta_SO, MTTR_SO : paramètres de défaillance sortie
    lambda_FD     : taux de défaillance dangereuse détectée finale
    beta_override : si fourni, remplace le β de la base de données

    Retourne un dict prêt pour SubsystemParams(**result).
    """
    beta_val = beta_override if beta_override is not None else entry.beta
    if beta_val is None:
        raise ValueError(
            f"β non défini pour '{entry.key}'. "
            "Fournir beta_override= ou utiliser la Table 3.12 PDS 2021."
        )

    lambda_DD = entry.lambda_DD  # calculé depuis la property

    return {
        "lambda_DU": entry.lambda_DU,
        "lambda_DD": lambda_DD,
        "lambda_S": entry.lambda_S if entry.lambda_S is not None else 0.0,
        "DC": entry.DC,
        "beta": beta_val,
        "beta_D": beta_val,          # convention PDS : β_D = β pour simplification
        "MTTR": MTTR,
        "MTTR_DU": MTTR_DU,
        "T1": T1,
        "PTC": PTC,
        "T2": T2,
        "architecture": architecture,
        "M": M,
        "N": N,
        "lambda_SO": lambda_SO,
        "beta_SO": beta_SO,
        "MTTR_SO": MTTR_SO,
        "lambda_FD": lambda_FD,
    }


# ─────────────────────────────────────────────────────────────────
# Récap rapide
# ─────────────────────────────────────────────────────────────────

def summary() -> str:
    """Affiche un résumé de la base de données."""
    from collections import Counter
    cats = Counter(e.category for e in _DB.values())
    lines = [
        "=" * 60,
        "  PRISM Lambda DB — PDS Data Handbook 2021",
        f"  {len(_DB)} équipements indexés",
        "=" * 60,
    ]
    for cat, count in sorted(cats.items()):
        lines.append(f"  {cat:<30} {count:>3} entrées")
    lines.append("=" * 60)
    return "\n".join(lines)


if __name__ == "__main__":
    print(summary())
    print()
    # Exemple d'utilisation
    e = get_lambda("pressure_transmitter")
    print(f"Équipement : {e.description}")
    print(f"  λ_DU     = {e.lambda_DU:.3e} /h")
    print(f"  λ_DD     = {e.lambda_DD:.3e} /h")
    print(f"  DC       = {e.DC:.0%}")
    print(f"  SFF      = {e.SFF:.0%}")
    print(f"  β        = {e.beta}")
    print(f"  Section  : PDS 2021 §{e.section}")
