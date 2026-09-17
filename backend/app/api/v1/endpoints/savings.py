from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user
from app.models.models import User, SavingsGoal
from app.schemas.schemas import SavingsGoalCreate, SavingsGoalUpdate, SavingsGoalDeposit, SavingsGoalResponse

router = APIRouter()

def to_savings_response(goal: SavingsGoal) -> SavingsGoalResponse:
    pct = (goal.current_amount_paise / goal.target_amount_paise * 100) if goal.target_amount_paise > 0 else 0.0
    return SavingsGoalResponse(
        id=goal.id,
        user_id=goal.user_id,
        title=goal.title,
        target_amount_paise=goal.target_amount_paise,
        current_amount_paise=goal.current_amount_paise,
        target_date=goal.target_date,
        color=goal.color,
        icon=goal.icon,
        is_completed=goal.is_completed,
        percentage_achieved=round(min(100.0, pct), 1),
        created_at=goal.created_at,
        updated_at=goal.updated_at
    )

@router.get("/", response_model=List[SavingsGoalResponse])
def get_savings_goals(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    goals = db.query(SavingsGoal).filter(SavingsGoal.user_id == current_user.id).order_by(SavingsGoal.is_completed.asc(), SavingsGoal.id.desc()).all()
    return [to_savings_response(g) for g in goals]

@router.post("/", response_model=SavingsGoalResponse, status_code=status.HTTP_201_CREATED)
def create_savings_goal(
    goal_in: SavingsGoalCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    goal = SavingsGoal(
        user_id=current_user.id,
        title=goal_in.title.strip(),
        target_amount_paise=goal_in.target_amount_paise,
        current_amount_paise=goal_in.current_amount_paise or 0,
        target_date=goal_in.target_date,
        color=goal_in.color or "#3b82f6",
        icon=goal_in.icon or "target",
        is_completed=(goal_in.current_amount_paise >= goal_in.target_amount_paise if goal_in.current_amount_paise else False)
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return to_savings_response(goal)

@router.put("/{id}", response_model=SavingsGoalResponse)
def update_savings_goal(
    id: int,
    goal_in: SavingsGoalUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    goal = db.query(SavingsGoal).filter(SavingsGoal.id == id, SavingsGoal.user_id == current_user.id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Savings goal not found")

    if goal_in.title is not None:
        goal.title = goal_in.title.strip()
    if goal_in.target_amount_paise is not None:
        goal.target_amount_paise = goal_in.target_amount_paise
    if goal_in.current_amount_paise is not None:
        goal.current_amount_paise = goal_in.current_amount_paise
    if goal_in.target_date is not None:
        goal.target_date = goal_in.target_date
    if goal_in.color is not None:
        goal.color = goal_in.color
    if goal_in.icon is not None:
        goal.icon = goal_in.icon
    if goal_in.is_completed is not None:
        goal.is_completed = goal_in.is_completed
    else:
        goal.is_completed = (goal.current_amount_paise >= goal.target_amount_paise)

    db.commit()
    db.refresh(goal)
    return to_savings_response(goal)

@router.post("/{id}/deposit", response_model=SavingsGoalResponse)
def deposit_to_savings_goal(
    id: int,
    deposit_in: SavingsGoalDeposit,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    goal = db.query(SavingsGoal).filter(SavingsGoal.id == id, SavingsGoal.user_id == current_user.id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Savings goal not found")

    goal.current_amount_paise = max(0, goal.current_amount_paise + deposit_in.amount_paise)
    if goal.current_amount_paise >= goal.target_amount_paise:
        goal.is_completed = True

    db.commit()
    db.refresh(goal)
    return to_savings_response(goal)

@router.delete("/{id}", status_code=status.HTTP_200_OK)
def delete_savings_goal(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    goal = db.query(SavingsGoal).filter(SavingsGoal.id == id, SavingsGoal.user_id == current_user.id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Savings goal not found")

    db.delete(goal)
    db.commit()
    return {"message": "Savings goal deleted", "id": id}
