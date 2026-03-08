"""PRISM Calc Engine — Solver Package."""

from .formulas import (
    SubsystemParams, pfd_arch, pfh_arch, pfh_arch_corrected,
    str_analytical, sil_from_pfd, sil_from_pfh,
    lambda_T1_product, markov_required,
)
from .markov import MarkovSolver, compute_exact
from .pst import PSTSolver, pst_analytical_koon
from .pds import PDSSolver
from .str_solver import str_analytical as str_analytical_solver, str_markov
from .montecarlo import SystemMonteCarlo
from .extensions import (
    # PFH/PFD koon généralisés
    pfh_moon, pfh_moon_arch,
    pfd_koon_generic, pfd_arch_extended,
    # PFD(t) instantané
    pfd_instantaneous, PFDCurveResult,
    # MGL CCF
    pfd_mgl, pfh_mgl, MGLParams,
    # Contraintes architecturales Route 1H/2H
    architectural_constraints, sil_achieved, ArchConstraintResult,
    # Demand duration
    pfd_demand_duration,
    # Routage auto IEC → Markov
    route_compute,
)
