from __future__ import annotations

from fastapi import APIRouter, Response

from app.schemas import LambdaDbLibraryResponse, SILComputeRequest, SILComputeResponse, SILReportRequest
from app.services.component_library_service import list_lambda_db_component_library
from app.services.sil_service import compute_sil
from app.services.sil_report_service import create_sil_report_pdf_response

router = APIRouter()


@router.post("/sil/compute", response_model=SILComputeResponse)
def compute_sil_endpoint(payload: SILComputeRequest) -> SILComputeResponse:
    return compute_sil(payload)


@router.post("/sil/report")
def build_sil_report_endpoint(payload: SILReportRequest) -> Response:
    return create_sil_report_pdf_response(payload)


@router.get("/library/components", response_model=LambdaDbLibraryResponse)
def list_component_library_endpoint() -> LambdaDbLibraryResponse:
    return list_lambda_db_component_library()
