import { select } from 'd3-selection';

export default class Slider {
  constructor() {
    this._all = [];
    this._current = [];
    this._pointer = 0;
    this._running = false;

    this._amount = 1;
    this._direction = 1;
    this._duration = 250;
    this._orientation = 'horizontal';
    this._remove = false;
    this._rotate = true;

    this._root = select('body')
      .append('div')
      .classed('scola slider', true)
      .styles({
        'height': '100%',
        'overflow': 'hidden',
        'position': 'absolute',
        'width': '100%'
      });
  }

  destroy() {
    this._root.dispatch('destroy');
    this._root.remove();
    this._root = null;
  }

  root() {
    return this._root;
  }

  amount(amount) {
    if (typeof amount === 'undefined') {
      return this._amount;
    }

    this._amount = amount;
    return this;
  }

  direction(direction) {
    if (typeof direction === 'undefined') {
      return this._direction === 1 ? 'ltr' : 'rtl';
    }

    this._direction = direction === 'ltr' ? 1 : -1;
    return this;
  }

  duration(duration) {
    if (typeof duration === 'undefined') {
      return this._duration;
    }

    this._duration = duration;
    return this;
  }

  orientation(orientation) {
    if (typeof orientation === 'undefined') {
      return this._orientation;
    }

    this._orientation = orientation;
    return this;
  }

  remove(remove) {
    if (typeof remove === 'undefined') {
      return this._remove;
    }

    this._remove = remove;
    return this;
  }

  rotate(rotate) {
    if (typeof rotate === 'undefined') {
      return this._rotate;
    }

    this._rotate = rotate;
    return this;
  }

  append(element) {
    if (this._running) {
      return this;
    }

    this._all.push(element);

    if (this._all.length <= this._amount) {
      this._current.push(element);
      this._root.node().appendChild(element.root().node());

      this._root.dispatch('slide', {
        detail: this._current
      });
    }

    this._setDimensions(element);
    this._setPosition(element, this._all.indexOf(element));

    return this;
  }

  prepend(element) {
    if (this._running) {
      return this;
    }

    this._all.unshift(element);

    if (this._all.length <= this._amount) {
      this._current.unshift(element);
      this._root.node().insertBefore(element.root().node(),
        this._root.node().firstChild);
      this._root.dispatch('slide', {
        detail: this._current
      });
    } else {
      this._pointer += 1;
    }

    this._setDimensions(element);
    this._setPosition(element, this._all.indexOf(element));

    return this;
  }

  forward() {
    if (this._running) {
      return this;
    }

    return this._slideForward(
      this._current,
      this._calculateForward()
    );
  }

  backward() {
    if (this._running) {
      return this;
    }

    return this._slideBackward(
      this._current,
      this._calculateBackward()
    );
  }

  toward(target) {
    if (this._running) {
      return this;
    }

    const pointer = this._all.indexOf(target);

    if (pointer > this._pointer) {
      this._slideTowardForward(
        this._calculateTowardForward(pointer)
      );
    } else if (pointer < this._pointer) {
      this._slideTowardBackward(
        this._calculateTowardBackward(pointer)
      );
    }

    return this;
  }

  reset() {
    return this
      ._resetAll()
      ._resetCurrent();
  }

  clear(current) {
    if (this._running) {
      return this;
    }

    this._all.forEach((element) => {
      if (current !== false || this._current.indexOf(element) === -1) {
        element.destroy();
      }
    });

    this._all = [];
    this._current = current !== false ? [] : this._current;
    this._pointer = 0;
    this._running = false;

    return this;
  }

  _calculateForward() {
    const hasEnough = this._all.length >= 2 * this._amount;

    this._pointer += this._amount;

    if (this._pointer > this._all.length) {
      this._pointer -= this._all.length;
    }

    let elements = this._all.slice(this._pointer,
      this._pointer + this._amount);
    const shortage = this._amount - elements.length;

    if (shortage > 0) {
      if (this._rotate && hasEnough) {
        elements = elements.concat(
          this._all.slice(0, shortage)
        );
      } else {
        this._pointer -= shortage;
      }
    }

    return elements;
  }

  _slideForward(current, elements) {
    if (elements.length === 0) {
      return this;
    }

    this._running = true;
    this._current = [];

    const name = this._getPositionName();
    const sizeName = this._getSizeName();
    const size = parseFloat(this._root.style(sizeName)) / this._amount;

    let fromIndex = 0;
    let toIndex = 0;
    let numRunning = 0;

    current.forEach((element, index) => {
      if (elements.length - index <= 0) {
        this._current.push(element);
      }

      element.root()
        .transition()
        .duration(this._duration)
        .style(name,
          ((elements.length - index) * -size * this._direction) + 'px')
        .on('end', () => {
          if (this._current.indexOf(element) === -1) {
            element.root().remove();
          }
        });
    });

    elements.forEach((element, index) => {
      this._current.push(element);

      fromIndex = index + this._amount;
      toIndex = elements.length - index - this._amount;
      numRunning += 1;

      this._root.node().appendChild(element.root().node());

      element.root()
        .style(name, (fromIndex * size * this._direction) + 'px')
        .transition()
        .duration(this._duration)
        .style(name, (toIndex * -size * this._direction) + 'px')
        .on('end', () => {
          numRunning -= 1;

          if (numRunning === 0) {
            this._running = false;
            this._root.dispatch('slide', {
              detail: this._current
            });
          }
        });
    });

    return this;
  }

  _calculateBackward() {
    const hasEnough = this._all.length >= 2 * this._amount;

    this._pointer -= this._amount;
    let amount = this._amount;

    if (this._pointer < 0) {
      if (this._rotate && hasEnough) {
        this._pointer += this._all.length;
      } else {
        amount += this._pointer;
        this._pointer = 0;
      }
    }

    let elements = this._all.slice(this._pointer, this._pointer + amount);
    const shortage = this._amount - elements.length;

    if (shortage > 0 && this._rotate && hasEnough) {
      elements = elements.concat(
        this._all.slice(0, shortage)
      );
    }

    return elements;
  }

  _slideBackward(current, elements) {
    if (elements.length === 0) {
      return this;
    }

    this._running = true;
    this._current = [];

    const name = this._getPositionName();
    const sizeName = this._getSizeName();
    const size = parseFloat(this._root.style(sizeName)) / this._amount;

    let numRunning = 0;

    elements.forEach((element, index) => {
      this._current.push(element);
      this._root.node().appendChild(element.root().node());

      numRunning += 1;

      element.root()
        .style(name,
          ((elements.length - index) * -size * this._direction) + 'px')
        .transition()
        .duration(this._duration)
        .style(name, (index * size * this._direction) + 'px')
        .on('end', () => {
          numRunning -= 1;

          if (numRunning === 0) {
            this._running = false;
            this._root.dispatch('slide', {
              detail: this._current
            });
          }
        });
    });

    current.forEach((element, index) => {
      if (elements.length + index < this._amount) {
        this._current.push(element);
      }

      element.root()
        .transition()
        .duration(this._duration)
        .style(name,
          ((elements.length + index) * size * this._direction) + 'px')
        .on('end', () => {
          if (this._current.indexOf(element) === -1) {
            element.root().remove();

            if (this._remove) {
              this._all.splice(this._all.indexOf(element), 1);
              element.destroy();
            }
          }
        });
    });

    return this;
  }

  _calculateTowardForward(pointer) {
    const elements = this._all.slice(
      this._pointer,
      pointer + this._amount
    );

    this._pointer = Math.min(
      this._all.length - this._amount,
      pointer
    );

    return elements;
  }

  _slideTowardForward(elements) {
    if (elements.length === 0) {
      return this;
    }

    this._running = true;

    const current = this._current;
    const name = this._getPositionName();
    const sizeName = this._getSizeName();
    const size = parseFloat(this._root.style(sizeName)) / this._amount;

    let toIndex = 0;
    let numRunning = 0;

    this._current = this._all.slice(this._pointer,
      this._pointer + this._amount);

    elements.forEach((element, index) => {
      toIndex = elements.length - index - this._amount;
      numRunning += 1;

      if (current.indexOf(element) === -1) {
        this._root.node().appendChild(element.root().node());
        element.root().style(name, (index * size * this._direction) + 'px');
      }

      element.root()
        .transition()
        .duration(this._duration)
        .style(name, (toIndex * -size * this._direction) + 'px')
        .on('end', () => {
          numRunning -= 1;

          if (numRunning === 0) {
            this._running = false;
            this._root.dispatch('slide', {
              detail: this._current
            });
          }

          if (this._current.indexOf(element) === -1) {
            element.root().remove();
          }
        });
    });

    return this;
  }

  _calculateTowardBackward(pointer) {
    const elements = this._all.slice(pointer, this._pointer + this._amount);
    this._pointer = pointer;

    return elements;
  }

  _slideTowardBackward(elements) {
    if (elements.length === 0) {
      return this;
    }

    this._running = true;

    const name = this._getPositionName();
    const sizeName = this._getSizeName();
    const size = parseFloat(this._root.style(sizeName)) / this._amount;

    const current = this._current;
    this._current = elements.slice(0, this._amount);

    let fromIndex = 0;
    let numRunning = 0;

    elements.forEach((element, index) => {
      fromIndex = elements.length - index - this._amount;
      numRunning += 1;

      if (current.indexOf(element) === -1) {
        this._root.node().appendChild(element.root().node());
        element.root().style(name,
          (fromIndex * -size * this._direction) + 'px');
      }

      element.root()
        .transition()
        .duration(this._duration)
        .style(name, (index * size * this._direction) + 'px')
        .on('end', () => {
          numRunning -= 1;

          if (numRunning === 0) {
            this._running = false;
            this._root.dispatch('slide', {
              detail: this._current
            });
          }

          if (this._current.indexOf(element) === -1) {
            element.root().remove();
          }
        });
    });

    return this;
  }

  _resetAll() {
    this._all.forEach((element) => {
      this._setDimensions(element);
    });

    return this;
  }

  _resetCurrent(pointer) {
    pointer = pointer || 0;

    this._current.forEach((element) => {
      element.root().remove();
    });

    this._pointer = pointer;
    this._current = this._all.slice(this._pointer,
      this._pointer + this._amount);

    this._current.forEach((element, index) => {
      this._root.node().appendChild(element.root().node());
      this._setPosition(element, index);
    });

    return this;
  }

  _getPositionName() {
    return this._orientation === 'horizontal' ? 'left' : 'top';
  }

  _getSizeName() {
    return this._orientation === 'horizontal' ? 'width' : 'height';
  }

  _setDimensions(element) {
    const dimensions = {
      height: '100%',
      width: '100%'
    };

    const sizeName = this._getSizeName();
    dimensions[sizeName] = (1 / this._amount * 100) + '%';

    element.root().styles(dimensions);
    return this;
  }

  _setPosition(element, index) {
    const name = this._getPositionName();
    const sizeName = this._getSizeName();
    const size = parseFloat(this._root.style(sizeName)) / this._amount;

    element.root().style(name, (index * size) + 'px');

    return this;
  }
}
