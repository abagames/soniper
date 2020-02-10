import * as pointer from "../util/pointer";
import * as view from "../util/view";
import * as text from "../util/text";
import { Vector } from "../util/vector";

export type Button = {
  pos: Vector;
  text: string;
  onClick: () => void;
  isPressed: boolean;
};

const size = new Vector(31, 7);

export function get({ pos, text, onClick }) {
  return {
    pos,
    text,
    onClick,
    isPressed: false
  };
}

export function update(button: Button) {
  const o = new Vector(pointer.pos).sub(button.pos);
  const isHovered = o.isInRect(0, 0, size.x, size.y);
  if (pointer.isJustPressed && isHovered) {
    button.isPressed = true;
  }
  if (button.isPressed && !isHovered) {
    button.isPressed = false;
  }
  if (button.isPressed && pointer.isJustReleased) {
    button.onClick();
    button.isPressed = false;
  }
  const rgb = text.rgbObjects[button.isPressed ? 5 : 12];
  view.context.fillStyle = `rgb(${rgb.r},${rgb.g},${rgb.b})`;
  view.context.fillRect(button.pos.x, button.pos.y, size.x, size.y);
  text.print(button.text, button.pos.x, button.pos.y, {
    color: isHovered ? "w" : "W"
  });
}
