from __future__ import annotations

from fastapi import APIRouter, Response

from app.schemas import SILComputeRequest, SILComputeResponse, SILReportRequest
from app.services.sil_service import compute_sil
from app.services.sil_report_service import create_sil_report_pdf_response

router = APIRouter()


@router.post("/sil/compute", response_model=SILComputeResponse)
def compute_sil_endpoint(payload: SILComputeRequest) -> SILComputeResponse:
    return compute_sil(payload)


@router.post("/sil/report")
def build_sil_report_endpoint(payload: SILReportRequest) -> Response:
    return create_sil_report_pdf_response(payload)
