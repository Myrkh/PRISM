"""
Tests — IEC 61508 PFD calculation engine
Run: pytest tests/ -v --cov=core
"""
import math
import pytest
from core.math.pfd_calc import (
    SubsystemParams, calc_pfd, calc_sff, calc_dc, classify_sil, pfd_at_time
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def make_params(**kwargs) -> SubsystemParams:
    defaults = dict(
        lambda_DU=100, lambda_DD=200, lambda_SU=50, lambda_SD=50,
        TI=8760, MTTR=8, beta=0.1, architecture="1oo1"
    )
    defaults.update(kwargs)
    return SubsystemParams(**defaults)


# ---------------------------------------------------------------------------
# classify_sil
# ---------------------------------------------------------------------------
@pytest.mark.parametrize("pfd,expected", [
    (5e-6,  4),
    (5e-5,  3),
    (5e-4,  2),
    (5e-3,  1),
    (5e-2,  0),
    (0.5,   0),
])
def test_classify_sil(pfd, expected):
    assert classify_sil(pfd) == expected


# ---------------------------------------------------------------------------
# calc_sff
# ---------------------------------------------------------------------------
def test_calc_sff_basic():
    p = make_params(lambda_DU=100, lambda_DD=200, lambda_SU=50, lambda_SD=50)
    sff = calc_sff(p)
    # (200 + 50 + 50) / (100 + 200 + 50 + 50) = 300/400 = 0.75
    assert math.isclose(sff, 0.75, rel_tol=1e-6)


def test_calc_sff_zero_total():
    p = make_params(lambda_DU=0, lambda_DD=0, lambda_SU=0, lambda_SD=0)
    assert calc_sff(p) == 0.0


# ---------------------------------------------------------------------------
# calc_dc
# ---------------------------------------------------------------------------
def test_calc_dc_basic():
    p = make_params(lambda_DU=100, lambda_DD=300)
    dc = calc_dc(p)
    # 300 / (100 + 300) = 0.75
    assert math.isclose(dc, 0.75, rel_tol=1e-6)


# ---------------------------------------------------------------------------
# Architecture PFD formulas
# ---------------------------------------------------------------------------
@pytest.mark.parametrize("arch,expected_sil", [
    ("1oo1",  1),
    ("1oo2",  3),
    ("2oo2",  0),
    ("2oo3",  3),
    ("1oo2D", 3),
])
def test_pfd_architecture_sil(arch, expected_sil):
    p = make_params(architecture=arch)
    res = calc_pfd(p)
    assert res.SIL == expected_sil


def test_pfd_1oo1_formula():
    """IEC 61508-6 Eq. B.10a manual check"""
    p = make_params(lambda_DU=100, lambda_DD=0, TI=8760, MTTR=8, architecture="1oo1")
    lDU = 100 * 1e-9
    expected = lDU * 8760 / 2
    res = calc_pfd(p)
    assert math.isclose(res.PFD_avg, expected, rel_tol=1e-6)


def test_rrf_equals_reciprocal_pfd():
    p = make_params()
    res = calc_pfd(p)
    assert math.isclose(res.RRF, 1 / res.PFD_avg, rel_tol=1e-6)


def test_hft_values():
    expected = {"1oo1": 0, "2oo2": 0, "1oo2": 1, "1oo2D": 1, "2oo3": 1}
    for arch, hft in expected.items():
        res = calc_pfd(make_params(architecture=arch))
        assert res.HFT == hft, f"{arch}: expected HFT={hft}, got {res.HFT}"


# ---------------------------------------------------------------------------
# pfd_at_time
# ---------------------------------------------------------------------------
def test_pfd_at_time_1oo1():
    p = make_params(lambda_DU=100, lambda_DD=0, MTTR=8, architecture="1oo1")
    lDU = 100 * 1e-9
    t = 1000
    expected = lDU * t
    assert math.isclose(pfd_at_time("1oo1", t, p), expected, rel_tol=1e-6)


def test_pfd_at_time_zero():
    p = make_params()
    for arch in ["1oo1", "1oo2", "2oo2", "2oo3", "1oo2D"]:
        val = pfd_at_time(arch, 0, p)
        assert val >= 0, f"{arch} PFD at t=0 should be non-negative"
