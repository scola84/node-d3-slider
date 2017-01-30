import eachOf from 'async/eachOf';
import parallel from 'async/parallel';
import { select } from 'd3-selection';
import 'd3-selection-multi';
import 'd3-transition';

export default class Slider {
  constructor() {
    this._amount = 1;
    this._direction = 1;
    this._duration = 250;
    this._orientation = 'horizontal';
    this._remove = false;
    this._rotate = true;

    this._all = [];
    this._current = [];
    this._pointer = 0;
    this._running = false;

    this._root = select('body')
      .append('div')
      .remove()
      .classed('scola slider', true)
      .styles({
        'height': '100%',
        'overflow': 'hidden',
        'position': 'absolute',
        'width': '100%'
      });
  }

  destroy() {
    this._all = [];
    this._current = [];
    this._pointer = 0;
    this._runnnig = false;

    this._root.dispatch('destroy');
    this._root.remove();
    this._root = null;
  }

  root() {
    return this._root;
  }

  amount(value = null) {
    if (value === null) {
      return this._amount;
    }

    this._amount = value;
    return this;
  }

  direction(value = null) {
    if (value === null) {
      return this._direction === 1 ? 'ltr' : 'rtl';
    }

    this._direction = value === 'ltr' ? 1 : -1;
    return this;
  }

  duration(value = null) {
    if (value === null) {
      return this._duration;
    }

    this._duration = value;
    return this;
  }

  orientation(value = null) {
    if (value === null) {
      return this._orientation;
    }

    this._orientation = value;
    return this;
  }

  remove(value = null) {
    if (value === null) {
      return this._remove;
    }

    this._remove = value;
    return this;
  }

  rotate(value = null) {
    if (value === null) {
      return this._rotate;
    }

    this._rotate = value;
    return this;
  }

  append(element, action = true) {
    if (this._running) {
      return this;
    }

    if (action === false) {
      this._all.splice(this._all.indexOf(element), 1);
      element.root().remove();
      return this;
    }

    this._all.push(element);

    if (this._all.length <= this._amount) {
      this._current.push(element);
      this._root.node().appendChild(element.root().node());
      this._finishSlide();
    }

    this._setDimensions(element);
    this._setPosition(element, this._all.indexOf(element));

    return this;
  }

  prepend(element, action = true) {
    if (this._running) {
      return this;
    }

    if (action === false) {
      this._all.splice(this._all.indexOf(element), 1);
      element.root().remove();
      return this;
    }

    this._all.unshift(element);

    if (this._all.length <= this._amount) {
      this._current.unshift(element);
      this._root.node().insertBefore(element.root().node(),
        this._root.node().firstChild);
      this._finishSlide();
    } else {
      this._pointer += 1;
    }

    this._setDimensions(element);
    this._setPosition(element, this._all.indexOf(element));

    return this;
  }

  forward(callback = () => {}) {
    if (this._running) {
      return this;
    }

    return this._slideForward(
      this._current,
      this._calculateForward(),
      callback
    );
  }

  backward(callback = () => {}) {
    if (this._running) {
      return this;
    }

    return this._slideBackward(
      this._current,
      this._calculateBackward(),
      callback
    );
  }

  toward(target, callback = () => {}) {
    if (this._running) {
      callback();
      return this;
    }

    const pointer = this._all.indexOf(target);

    if (pointer > this._pointer) {
      this._slideTowardForward(
        this._calculateTowardForward(pointer),
        callback
      );
    } else if (pointer < this._pointer) {
      this._slideTowardBackward(
        this._calculateTowardBackward(pointer),
        callback
      );
    }

    return this;
  }

  has(element) {
    return this._all.indexOf(element) > -1;
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
        element.root().remove();
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

  _slideForward(current, elements, callback) {
    if (elements.length === 0) {
      return this;
    }

    this._running = true;
    this._current = [];

    const sizeName = this._getSizeName();
    const size = parseFloat(this._root.style(sizeName)) / this._amount;

    parallel([
      (parallelCallback) => {
        eachOf(elements, (element, index, eachCallback) => {
          this._showForward(elements, element, index, size, eachCallback);
        }, parallelCallback);
      },
      (parallelCallback) => {
        eachOf(current, (element, index, eachCallback) => {
          this._hideForward(elements, element, index, size, eachCallback);
        }, parallelCallback);
      }
    ], () => {
      this._finishSlide(callback);
    });

    return this;
  }

  _showForward(elements, element, index, size, eachCallback) {
    this._current.push(element);

    const fromValue = (index + this._amount) * size * this._direction;
    const toValue = (elements.length - index - this._amount) *
      -size * this._direction;

    this._root.node().appendChild(element.root().node());

    element.root()
      .style(this._getPositionName(), fromValue + 'px')
      .transition()
      .duration(this._duration)
      .style(this._getPositionName(), toValue + 'px')
      .on('end', eachCallback);
  }

  _hideForward(elements, element, index, size, eachCallback) {
    if (elements.length - index <= 0) {
      this._current.push(element);
    }

    const toValue = (elements.length - index) * -size * this._direction;

    element.root()
      .transition()
      .duration(this._duration)
      .style(this._getPositionName(), toValue + 'px')
      .on('end', () => {
        if (this._current.indexOf(element) === -1) {
          element.root().remove();
        }

        eachCallback();
      });
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

  _slideBackward(current, elements, callback) {
    if (elements.length === 0) {
      return this;
    }

    this._running = true;
    this._current = [];

    const sizeName = this._getSizeName();
    const size = parseFloat(this._root.style(sizeName)) / this._amount;

    parallel([
      (parallelCallback) => {
        eachOf(elements, (element, index, eachCallback) => {
          this._showBackward(elements, element, index, size, eachCallback);
        }, parallelCallback);
      },
      (parallelCallback) => {
        eachOf(current, (element, index, eachCallback) => {
          this._hideBackward(elements, element, index, size, eachCallback);
        }, parallelCallback);
      }
    ], () => {
      this._finishSlide(callback);
    });

    return this;
  }

  _showBackward(elements, element, index, size, eachCallback) {
    this._current.push(element);
    this._root.node().appendChild(element.root().node());

    const fromValue = (elements.length - index) * -size * this._direction;
    const toValue = index * size * this._direction;

    element.root()
      .style(this._getPositionName(), fromValue + 'px')
      .transition()
      .duration(this._duration)
      .style(this._getPositionName(), toValue + 'px')
      .on('end', eachCallback);
  }

  _hideBackward(elements, element, index, size, eachCallback) {
    if (elements.length + index < this._amount) {
      this._current.push(element);
    }

    const toValue = (elements.length + index) * size * this._direction;

    element.root()
      .transition()
      .duration(this._duration)
      .style(this._getPositionName(), toValue + 'px')
      .on('end', () => {
        if (this._current.indexOf(element) === -1) {
          element.root().remove();

          if (this._remove) {
            this._all.splice(this._all.indexOf(element), 1);
          }
        }

        eachCallback();
      });
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

  _slideTowardForward(elements, callback) {
    if (elements.length === 0) {
      return this;
    }

    this._running = true;

    const current = this._current;
    const sizeName = this._getSizeName();
    const size = parseFloat(this._root.style(sizeName)) / this._amount;

    this._current = this._all.slice(this._pointer,
      this._pointer + this._amount);

    eachOf(elements, (element, index, eachCallback) => {
      const fromValue = index * size * this._direction;

      if (current.indexOf(element) === -1) {
        this._root.node().appendChild(element.root().node());
        element.root().style(this._getPositionName(), fromValue + 'px');
      }

      this._towardForward(elements, element, index, size, eachCallback);
    }, () => {
      this._finishSlide(callback);
    });

    return this;
  }

  _towardForward(elements, element, index, size, eachCallback) {
    const toValue = (elements.length - index - this._amount) *
      -size * this._direction;

    element.root()
      .transition()
      .duration(this._duration)
      .style(this._getPositionName(), toValue + 'px')
      .on('end', () => {
        if (this._current.indexOf(element) === -1) {
          element.root().remove();
        }

        eachCallback();
      });
  }

  _calculateTowardBackward(pointer) {
    const elements = this._all.slice(pointer, this._pointer + this._amount);
    this._pointer = pointer;

    return elements;
  }

  _slideTowardBackward(elements, callback) {
    if (elements.length === 0) {
      return this;
    }

    this._running = true;

    const current = this._current;
    const sizeName = this._getSizeName();
    const size = parseFloat(this._root.style(sizeName)) / this._amount;

    this._current = elements.slice(0, this._amount);

    eachOf(elements, (element, index, eachCallback) => {
      const fromValue = (elements.length - index - this._amount) *
        -size * this._direction;

      if (current.indexOf(element) === -1) {
        this._root.node().appendChild(element.root().node());
        element.root().style(this._getPositionName(), fromValue + 'px');
      }

      this._towardBackward(elements, element, index, size, eachCallback);
    }, () => {
      this._finishSlide(callback);
    });

    return this;
  }

  _towardBackward(elements, element, index, size, eachCallback) {
    const toValue = index * size * this._direction;

    element.root()
      .transition()
      .duration(this._duration)
      .style(this._getPositionName(), toValue + 'px')
      .on('end', () => {
        if (this._current.indexOf(element) === -1) {
          element.root().remove();
        }

        eachCallback();
      });
  }

  _finishSlide(callback = () => {}) {
    this._running = false;

    this._root.dispatch('slide', {
      detail: this._current
    });

    callback();
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
